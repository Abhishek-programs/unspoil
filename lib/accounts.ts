import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { accounts } from '@/db/schema'
import { BANK_ACCOUNT_ID, defaultAccountId } from '@/constants/accounts'

export async function setAccountBalance(accountId: string, balance: number): Promise<void> {
  await db
    .update(accounts)
    .set({ balance: Math.round(balance * 1000) / 1000 })
    .where(eq(accounts.id, accountId))
}

export async function creditAccount(accountId: string, amount: number): Promise<void> {
  if (amount <= 0) return
  const row = await db.select().from(accounts).where(eq(accounts.id, accountId)).limit(1)
  const current = row[0]?.balance ?? 0
  await setAccountBalance(accountId, current + amount)
}

/** Drain `accountId` first; remainder from Bank. Returns amounts taken from each. */
export async function debitWithBankFallback(
  accountId: string | null | undefined,
  amount: number,
): Promise<{ fromPrimary: number; fromBank: number }> {
  if (amount <= 0) return { fromPrimary: 0, fromBank: 0 }
  const primaryId = accountId || defaultAccountId()
  const rows = await db.select().from(accounts)
  const byId = Object.fromEntries(rows.map(r => [r.id, r.balance]))
  const primaryBal = byId[primaryId] ?? 0
  const bankBal = byId[BANK_ACCOUNT_ID] ?? 0

  if (primaryId === BANK_ACCOUNT_ID) {
    await setAccountBalance(BANK_ACCOUNT_ID, bankBal - amount)
    return { fromPrimary: amount, fromBank: amount }
  }

  const fromPrimary = Math.min(Math.max(0, primaryBal), amount)
  const fromBank = amount - fromPrimary
  if (fromPrimary > 0) await setAccountBalance(primaryId, primaryBal - fromPrimary)
  if (fromBank > 0) await setAccountBalance(BANK_ACCOUNT_ID, bankBal - fromBank)
  return { fromPrimary, fromBank }
}

/** Undo a prior debitWithBankFallback (best-effort credit split). */
export async function creditSplit(
  accountId: string | null | undefined,
  fromPrimary: number,
  fromBank: number,
): Promise<void> {
  const primaryId = accountId || defaultAccountId()
  if (primaryId === BANK_ACCOUNT_ID) {
    await creditAccount(BANK_ACCOUNT_ID, fromPrimary || fromBank)
    return
  }
  if (fromPrimary > 0) await creditAccount(primaryId, fromPrimary)
  if (fromBank > 0) await creditAccount(BANK_ACCOUNT_ID, fromBank)
}

/** Force Bank so Bank + eSewa + Cash === yourMoney. */
export async function reconcileAccountsToYourMoney(yourMoney: number): Promise<void> {
  const rows = await db.select().from(accounts)
  const nonBank = rows.filter(r => r.id !== BANK_ACCOUNT_ID).reduce((s, r) => s + r.balance, 0)
  const bankTarget = Math.round((yourMoney - nonBank) * 1000) / 1000
  await setAccountBalance(BANK_ACCOUNT_ID, bankTarget)
}
