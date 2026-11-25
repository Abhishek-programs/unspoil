import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  accounts,
  accountTransfers,
  bucketBalances,
  buckets,
  playbook,
  transactions,
} from '@/db/schema'
import { BANK_ACCOUNT_ID, defaultAccountId } from '@/constants/accounts'
import { MISC_BUCKET_ID } from '@/constants/defaults'
import { effectiveCap } from '@/lib/bucket-balance'
import { roundPaisa } from '@/lib/format'
import { getMonthRange } from '@/lib/month'
import { clearPersonalCapOverrideIfNeeded } from '@/lib/personal-cap'
import { ackQueuedPayments, getQueuedPaymentsJson, setHelperSnapshot } from '@/lib/payment-watch'
import { useAccountsStore } from '@/store/accounts'
import { useBucketsStore, type Bucket } from '@/store/buckets'
import { usePlaybookStore } from '@/store/playbook'
import { useTransactionsStore } from '@/store/transactions'

type QueuedPayment = { opId: string; txnId: string } & (
  | {
      op: 'log'
      amount: number
      merchant: string
      description: string | null
      accountId: string
      createdAt: string
    }
  | { op: 'assign'; bucketId: string }
)

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function adjustFund(tx: Tx, bucketId: string, next: (current: number) => number) {
  const row = tx.select().from(bucketBalances).where(eq(bucketBalances.bucketId, bucketId)).get()
  const balance = Math.max(0, next(row?.balance ?? 0))
  const updatedAt = new Date().toISOString()
  if (row) {
    tx.update(bucketBalances).set({ balance, updatedAt }).where(eq(bucketBalances.id, row.id)).run()
  } else {
    tx.insert(bucketBalances).values({ id: generateId(), bucketId, balance, updatedAt }).run()
  }
}

// Same rule as debitWallet in store/accounts.ts, kept synchronous so it commits with the flag.
function debitWallet(tx: Tx, accountId: string | null, amount: number) {
  const primaryId = accountId || defaultAccountId()
  const balanceOf = (id: string) =>
    tx.select().from(accounts).where(eq(accounts.id, id)).get()?.balance ?? 0
  const setBalance = (id: string, balance: number) =>
    tx.update(accounts).set({ balance: roundPaisa(balance) }).where(eq(accounts.id, id)).run()

  const primary = balanceOf(primaryId)
  if (primaryId === BANK_ACCOUNT_ID) {
    setBalance(BANK_ACCOUNT_ID, primary - amount)
    return
  }
  const fromPrimary = Math.min(Math.max(0, primary), amount)
  const fromBank = amount - fromPrimary
  if (fromPrimary > 0) setBalance(primaryId, primary - fromPrimary)
  if (fromBank <= 0) return
  setBalance(BANK_ACCOUNT_ID, balanceOf(BANK_ACCOUNT_ID) - fromBank)
  const now = new Date().toISOString()
  tx.insert(accountTransfers)
    .values({
      id: generateId(),
      fromAccountId: BANK_ACCOUNT_ID,
      toAccountId: primaryId,
      amount: fromBank,
      note: 'Wallet shortfall',
      date: now,
      createdAt: now,
    })
    .run()
}

// Every op is safe to apply twice: a kill before the ack replays it on the next launch.
function applyOp(tx: Tx, op: QueuedPayment) {
  if (op.op === 'log') {
    const pb = tx.select().from(playbook).limit(1).get()
    tx.insert(transactions)
      .values({
        id: op.txnId,
        type: 'expense',
        amount: op.amount,
        merchant: op.merchant,
        description: op.description,
        bucketId: pb?.fallbackBucketId || MISC_BUCKET_ID,
        date: op.createdAt,
        source: 'notification',
        accountId: op.accountId,
        isFlagged: true,
        createdAt: op.createdAt,
      })
      .onConflictDoNothing()
      .run()
    return
  }

  const txn = tx.select().from(transactions).where(eq(transactions.id, op.txnId)).get()
  const bucketOf = (id: string) => tx.select().from(buckets).where(eq(buckets.id, id)).get()
  const next = bucketOf(op.bucketId)
  // Deleted since: nothing to assign. A missing bucket leaves it flagged for review in the app.
  if (!txn || !next) return
  if (!txn.isFlagged && txn.bucketId === next.id) return

  tx.update(transactions)
    .set({ bucketId: next.id, isFlagged: false })
    .where(eq(transactions.id, txn.id))
    .run()

  // A flagged payment has not touched any fund or account yet.
  if (txn.isFlagged) {
    debitWallet(tx, txn.accountId, txn.amount + txn.feeAmount)
  } else {
    const prev = bucketOf(txn.bucketId)
    if (prev?.accumulates) {
      const cap = effectiveCap(prev as Bucket)
      adjustFund(tx, prev.id, current =>
        cap != null && cap > 0 ? Math.min(current + txn.amount, cap) : current + txn.amount,
      )
    }
  }
  if (next.accumulates) adjustFund(tx, next.id, current => current - txn.amount)
}

async function drain(): Promise<number> {
  const ops = JSON.parse(await getQueuedPaymentsJson()) as QueuedPayment[]
  if (ops.length === 0) return 0
  const pb = db.select().from(playbook).limit(1).get()
  if (!pb?.isOnboarded) return 0

  const done: QueuedPayment[] = []
  const failedTxns = new Set<string>()
  for (const op of ops) {
    // Keep a payment's ops in order: no bucket pick before its log landed.
    if (failedTxns.has(op.txnId)) continue
    try {
      db.transaction(tx => applyOp(tx, op))
      done.push(op)
    } catch (e) {
      console.error('Queued payment failed:', e)
      failedTxns.add(op.txnId)
    }
  }
  if (done.length > 0) await ackQueuedPayments(done.map(op => op.opId))

  for (const op of done) {
    if (op.op !== 'assign') continue
    const txn = db.select().from(transactions).where(eq(transactions.id, op.txnId)).get()
    const bucket = db.select().from(buckets).where(eq(buckets.id, op.bucketId)).get()
    if (txn && bucket) await clearPersonalCapOverrideIfNeeded(txn.amount, bucket as Bucket)
  }
  return done.length
}

async function reloadStores() {
  const pb = usePlaybookStore.getState()
  // Startup and the headless backup load from the database after this anyway.
  if (!pb.isLoaded || !useBucketsStore.getState().isLoaded) return
  const { start, end } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate)
  await useBucketsStore.getState().loadBuckets()
  await useAccountsStore.getState().loadAccounts()
  await useTransactionsStore.getState().loadTransactions(start, end)
}

let running: Promise<void> | null = null

/** Move payments the helper queued into the database. Never throws. */
export function syncQueuedPayments(): Promise<void> {
  running ??= (async () => {
    try {
      if ((await drain()) > 0) await reloadStores()
    } catch (e) {
      console.error('Payment queue sync failed:', e)
    } finally {
      running = null
    }
  })()
  return running
}

let lastSnapshot = ''

function pushSnapshot() {
  const { buckets: all, isLoaded } = useBucketsStore.getState()
  if (!isLoaded) return
  const rows = all
    .filter(b => b.isActive && b.type === 'spending')
    .sort(
      (a, b) =>
        Number(a.accumulates ?? false) - Number(b.accumulates ?? false) ||
        a.sortOrder - b.sortOrder ||
        a.name.localeCompare(b.name),
    )
    .map(b => ({ id: b.id, name: b.name, icon: b.icon }))
  const json = JSON.stringify({ currency: usePlaybookStore.getState().currency, buckets: rows })
  if (json === lastSnapshot) return
  lastSnapshot = json
  void setHelperSnapshot(json).catch(() => {
    lastSnapshot = ''
  })
}

/** Keep the helper's bucket list and currency current. Returns the unsubscribe. */
export function mirrorHelperSnapshot(): () => void {
  pushSnapshot()
  const offBuckets = useBucketsStore.subscribe(pushSnapshot)
  const offPlaybook = usePlaybookStore.subscribe(pushSnapshot)
  return () => {
    offBuckets()
    offPlaybook()
  }
}
