import { create } from 'zustand'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'
import { getMonthRange } from '@/lib/month'
import {
  deductFromAccumulatingBucket,
  restoreToAccumulatingBucket,
} from '@/lib/bucket-balance'
import { isSavingsConfirmTxn, SALARY_BUCKET_ID } from '@/lib/txn-kind'
import { clearPersonalCapOverrideIfNeeded } from '@/lib/personal-cap'
import { useBucketsStore } from '@/store/buckets'
import { useAccountsStore } from '@/store/accounts'
import { defaultAccountId } from '@/constants/accounts'
import { SIP_BUCKET_ID } from '@/constants/defaults'
import { spentTowardBucket } from '@/lib/spent'

export const INCOME_BUCKET_ID = '_income'
export { SALARY_BUCKET_ID }

export interface Transaction {
  id: string
  type: 'expense' | 'income'
  amount: number
  feeAmount: number
  merchant: string | null
  description: string | null
  bucketId: string
  date: string
  source: 'manual' | 'ocr' | 'overlay' | 'notification'
  fundedFromBucketId: string | null
  accountId: string | null
  parsedTxnId: string | null
  isFlagged: boolean
  isRecurringDraft: boolean
  createdAt: string
}

interface TransactionsState {
  transactions: Transaction[]
  allTransactions: Transaction[]
  flaggedTransactions: Transaction[]
  isLoaded: boolean
  loadTransactions: (monthStart: Date, monthEnd: Date) => Promise<void>
  loadAllTransactions: () => Promise<void>
  addTransaction: (
    txn: Omit<Transaction, 'id' | 'createdAt' | 'accountId' | 'feeAmount'> & {
      accountId?: string | null
      feeAmount?: number
    },
  ) => Promise<{ overspent?: number }>
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  getSpentByBucket: (bucketId: string) => number
  getConfirmedSavingsBuckets: () => Set<string>
  getTotalIncome: () => number
  ensureSalaryTransaction: (
    monthStartDay: number,
    salary: number,
    earlyMonthStartDate?: string | null,
  ) => Promise<void>
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function isFundedFromSavingsConfirm(txn: {
  type: string
  bucketId: string
  fundedFromBucketId?: string | null
}): boolean {
  return (
    !!txn.fundedFromBucketId &&
    isSavingsConfirmTxn(txn, useBucketsStore.getState().buckets)
  )
}

async function applyFundedFromDebit(
  fundedFromBucketId: string | null | undefined,
  amount: number,
): Promise<number | undefined> {
  if (!fundedFromBucketId) return undefined
  const fundedBucket = useBucketsStore.getState().buckets.find(b => b.id === fundedFromBucketId)
  if (!fundedBucket?.accumulates) return undefined

  const result = await deductFromAccumulatingBucket(fundedBucket.id, amount)
  await clearPersonalCapOverrideIfNeeded(amount, fundedBucket)
  await useBucketsStore.getState().loadBuckets()
  return result.overspent > 0 ? result.overspent : undefined
}

async function restoreFundedFromDebit(
  fundedFromBucketId: string | null | undefined,
  amount: number,
): Promise<void> {
  if (!fundedFromBucketId) return
  const fundedBucket = useBucketsStore.getState().buckets.find(b => b.id === fundedFromBucketId)
  if (!fundedBucket?.accumulates) return

  await restoreToAccumulatingBucket(
    fundedBucket.id,
    amount,
    fundedBucket.accumulationCap,
    fundedBucket,
  )
  await useBucketsStore.getState().refreshBalances()
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  allTransactions: [],
  flaggedTransactions: [],
  isLoaded: false,

  loadTransactions: async (monthStart: Date, monthEnd: Date) => {
    const startStr = monthStart.toISOString()
    const endStr = monthEnd.toISOString()
    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, startStr),
          lte(transactions.date, endStr),
        )
      )
    const flagged = rows.filter(t => t.isFlagged)
    set({ transactions: rows, flaggedTransactions: flagged, isLoaded: true })
    await get().loadAllTransactions()
  },

  // Full history — goal progress, past periods, and trends span more than one month.
  loadAllTransactions: async () => {
    const rows = await db.select().from(transactions)
    set({ allTransactions: rows })
  },

  addTransaction: async (txn) => {
    const id = generateId()
    const now = new Date().toISOString()
    const row = {
      ...txn,
      feeAmount: txn.type === 'expense' ? Math.max(0, txn.feeAmount ?? 0) : 0,
      fundedFromBucketId: txn.fundedFromBucketId ?? null,
      accountId: txn.accountId ?? defaultAccountId(),
      id,
      createdAt: now,
    }
    await db.insert(transactions).values(row)

    if (!txn.isRecurringDraft) {
      const accounts = useAccountsStore.getState()
      if (txn.type === 'income') {
        await accounts.applyIncome(row.accountId, txn.amount)
      } else if (txn.type === 'expense' && !txn.isFlagged) {
        await accounts.applyExpense(row.accountId, txn.amount + row.feeAmount)
      }
    }

    let overspent: number | undefined
    const bucket = useBucketsStore.getState().buckets.find(b => b.id === txn.bucketId)
    if (bucket?.accumulates && txn.type === 'expense') {
      const result = await deductFromAccumulatingBucket(bucket.id, txn.amount)
      await clearPersonalCapOverrideIfNeeded(txn.amount, bucket)
      await useBucketsStore.getState().loadBuckets()
      if (result.overspent > 0) {
        overspent = result.overspent
      }
    }

    if (isFundedFromSavingsConfirm(row)) {
      const fundedOverspent = await applyFundedFromDebit(row.fundedFromBucketId, row.amount)
      if (fundedOverspent != null) {
        overspent = fundedOverspent
      }
    }

    const state = get()
    const allTxns = [...state.transactions, row]
    const flagged = allTxns.filter(t => t.isFlagged)
    set({
      transactions: allTxns,
      allTransactions: [...state.allTransactions, row],
      flaggedTransactions: flagged,
      isLoaded: true,
    })

    return { overspent }
  },

  updateTransaction: async (id, patch) => {
    const existing = get().transactions.find(t => t.id === id)
    if (!existing) return

    const next = { ...existing, ...patch }
    const directDebitChanged =
      existing.amount !== next.amount ||
      existing.bucketId !== next.bucketId ||
      existing.type !== next.type
    const updateData: Record<string, any> = {}
    if (patch.amount !== undefined) updateData.amount = patch.amount
    if (patch.feeAmount !== undefined) updateData.feeAmount = Math.max(0, patch.feeAmount)
    if (patch.merchant !== undefined) updateData.merchant = patch.merchant
    if (patch.description !== undefined) updateData.description = patch.description
    if (patch.bucketId !== undefined) updateData.bucketId = patch.bucketId
    if (patch.fundedFromBucketId !== undefined) {
      updateData.fundedFromBucketId = patch.fundedFromBucketId
    }
    if (patch.accountId !== undefined) updateData.accountId = patch.accountId
    if (patch.isFlagged !== undefined) updateData.isFlagged = patch.isFlagged
    if (patch.type !== undefined) updateData.type = patch.type
    if (patch.date !== undefined) updateData.date = patch.date
    if (patch.source !== undefined) updateData.source = patch.source

    if (directDebitChanged) {
      const oldBucket = useBucketsStore.getState().buckets.find(b => b.id === existing.bucketId)
      if (oldBucket?.accumulates && existing.type === 'expense') {
        await restoreToAccumulatingBucket(
          oldBucket.id,
          existing.amount,
          oldBucket.accumulationCap,
          oldBucket,
        )
      }
    }

    // Reverse old Personal funded-from debit, apply new if needed
    if (isFundedFromSavingsConfirm(existing)) {
      await restoreFundedFromDebit(existing.fundedFromBucketId, existing.amount)
    }

    await db.update(transactions).set(updateData).where(eq(transactions.id, id))

    if (isFundedFromSavingsConfirm(next)) {
      await applyFundedFromDebit(next.fundedFromBucketId, next.amount)
    }
    if (directDebitChanged) {
      const newBucket = useBucketsStore.getState().buckets.find(b => b.id === next.bucketId)
      if (newBucket?.accumulates && next.type === 'expense') {
        await deductFromAccumulatingBucket(newBucket.id, next.amount)
        await clearPersonalCapOverrideIfNeeded(next.amount, newBucket)
      }
      await useBucketsStore.getState().refreshBalances()
    }

    const accounts = useAccountsStore.getState()
    const wasFlaggedExpense = existing.type === 'expense' && existing.isFlagged && !existing.isRecurringDraft
    const nowUnflagged = next.type === 'expense' && !next.isFlagged && !next.isRecurringDraft

    // First-time categorize of a flagged payment: debit account
    if (wasFlaggedExpense && nowUnflagged && existing.isFlagged && patch.isFlagged === false) {
      await accounts.applyExpense(
        next.accountId ?? defaultAccountId(),
        next.amount + next.feeAmount,
      )
    } else if (
      !existing.isRecurringDraft &&
      !existing.isFlagged &&
      (patch.amount !== undefined ||
        patch.feeAmount !== undefined ||
        patch.accountId !== undefined ||
        patch.type !== undefined)
    ) {
      if (existing.type === 'income') {
        await accounts.applyExpense(existing.accountId, existing.amount)
      } else if (existing.type === 'expense') {
        await accounts.applyIncome(existing.accountId, existing.amount + existing.feeAmount)
      }
      if (next.type === 'income') {
        await accounts.applyIncome(next.accountId ?? defaultAccountId(), next.amount)
      } else if (next.type === 'expense' && !next.isFlagged) {
        await accounts.applyExpense(
          next.accountId ?? defaultAccountId(),
          next.amount + next.feeAmount,
        )
      }
    }

    const state = get()
    const applyPatch = (t: Transaction) => (t.id === id ? { ...t, ...patch } : t)
    const updated = state.transactions.map(applyPatch)
    const flagged = updated.filter(t => t.isFlagged)
    set({
      transactions: updated,
      allTransactions: state.allTransactions.map(applyPatch),
      flaggedTransactions: flagged,
    })
  },

  deleteTransaction: async (id) => {
    const txn = get().transactions.find(t => t.id === id)
    await db.delete(transactions).where(eq(transactions.id, id))

    if (txn) {
      if (!txn.isRecurringDraft && !(txn.type === 'expense' && txn.isFlagged)) {
        const accounts = useAccountsStore.getState()
        if (txn.type === 'income') {
          await accounts.applyExpense(txn.accountId, txn.amount)
        } else if (txn.type === 'expense') {
          await accounts.applyIncome(txn.accountId, txn.amount + txn.feeAmount)
        }
      }

      const bucket = useBucketsStore.getState().buckets.find(b => b.id === txn.bucketId)
      if (bucket?.accumulates && txn.type === 'expense') {
        await restoreToAccumulatingBucket(
          bucket.id,
          txn.amount,
          bucket.accumulationCap,
          bucket,
        )
        await useBucketsStore.getState().refreshBalances()
      }

      if (isFundedFromSavingsConfirm(txn)) {
        await restoreFundedFromDebit(txn.fundedFromBucketId, txn.amount)
      }
    }

    const state = get()
    const remaining = state.transactions.filter(t => t.id !== id)
    const flagged = remaining.filter(t => t.isFlagged)
    set({
      transactions: remaining,
      allTransactions: state.allTransactions.filter(t => t.id !== id),
      flaggedTransactions: flagged,
    })
  },

  getSpentByBucket: (bucketId: string) => {
    const bucket = useBucketsStore.getState().buckets.find(b => b.id === bucketId)
    if (!bucket) return 0
    return spentTowardBucket(bucket, get().transactions, useBucketsStore.getState().buckets)
  },

  getConfirmedSavingsBuckets: () => {
    const confirmedIds = new Set<string>()
    get().transactions.forEach(t => {
      if (
        !t.isFlagged &&
        !t.isRecurringDraft &&
        t.type === 'expense' &&
        isSavingsConfirmTxn(t, useBucketsStore.getState().buckets)
      ) {
        confirmedIds.add(t.bucketId)
      }
    })
    if (confirmedIds.has(SIP_BUCKET_ID)) {
      const sipBucket = useBucketsStore.getState().buckets.find(b => b.id === SIP_BUCKET_ID)
      const confirmedPrincipal = get()
        .transactions.filter(
          t =>
            t.bucketId === SIP_BUCKET_ID &&
            t.type === 'expense' &&
            !t.isFlagged &&
            !t.isRecurringDraft,
        )
        .reduce((sum, t) => sum + t.amount, 0)
      if (sipBucket && confirmedPrincipal < sipBucket.monthlyAmount) {
        confirmedIds.delete(SIP_BUCKET_ID)
      }
    }
    return confirmedIds
  },

  getTotalIncome: () => {
    return get()
      .transactions.filter(t => t.type === 'income' && !t.isRecurringDraft)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  ensureSalaryTransaction: async (
    monthStartDay: number,
    salary: number,
    earlyMonthStartDate?: string | null,
  ) => {
    if (salary <= 0) return
    const { start, end } = getMonthRange(monthStartDay, earlyMonthStartDate)
    const startStr = start.toISOString()
    const endStr = end.toISOString()

    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, startStr),
          lte(transactions.date, endStr),
          eq(transactions.type, 'income'),
          eq(transactions.bucketId, SALARY_BUCKET_ID),
        )
      )

    if (existing.length > 0) return

    const salaryDate = new Date(start)
    if (salaryDate > new Date()) return

    await get().addTransaction({
      type: 'income',
      amount: salary,
      description: 'Salary received',
      merchant: 'Salary',
      bucketId: SALARY_BUCKET_ID,
      date: salaryDate.toISOString(),
      source: 'manual',
      fundedFromBucketId: null,
      accountId: defaultAccountId(),
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    })
  },
}))
