import { and, gte, lte } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { accountAdjustments, lendBorrowEntries, playbook, transactions } from '@/db/schema'
import { currentMonthKey } from '@/lib/bucket-balance'
import { getPreviousMonthRange } from '@/lib/month'
import type { Bucket } from '@/store/buckets'
import type { Transaction } from '@/store/transactions'
import { computeMonthMetrics, type LendBorrowEntry } from '@/lib/lending/balance'
import { computeCashOnHand, periodCashFromTransactions } from '@/lib/your-money'
import { spentTowardBucket } from '@/lib/spent'
import { isSalaryTxn, isSavingsConfirmTxn } from '@/lib/txn-kind'

export function computeMonthSurplus(
  monthlyIncome: number,
  activeBuckets: Bucket[],
  transactions: Transaction[],
  lendingCashAdjust = 0,
): number {
  const totalAllocations = activeBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const regularSpending = activeBuckets.filter(b => b.type === 'spending' && !b.accumulates)
  const accumulating = activeBuckets.filter(b => b.type === 'spending' && b.accumulates)
  const lifestyleBudget = regularSpending.reduce((s, b) => s + b.monthlyAmount, 0)
  const personalTopUps = accumulating.reduce((s, b) => s + b.monthlyAmount, 0)
  const spendingPlan = lifestyleBudget + personalTopUps

  const lifestyleSpent = regularSpending.reduce(
    (s, b) => s + spentTowardBucket(b, transactions, activeBuckets),
    0,
  )
  const personalDraws = accumulating.reduce(
    (s, b) => s + spentTowardBucket(b, transactions, activeBuckets),
    0,
  )

  const salaryTransactions = transactions.filter(
    t => isSalaryTxn(t) && !t.isRecurringDraft,
  )
  const hasSalary = salaryTransactions.length > 0
  const effectiveIncome = salaryTransactions.reduce((sum, t) => sum + t.amount, 0)
  const unallocated = Math.max(
    0,
    (effectiveIncome || monthlyIncome) - totalAllocations,
  )
  const fees = transactions
    .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
    .reduce((sum, t) => sum + t.feeAmount, 0)
  const plannedSavings = activeBuckets
    .filter(b => b.type === 'savings' || b.type === 'investment')
    .reduce((sum, b) => sum + b.monthlyAmount, 0)
  const confirmedSavings = transactions
    .filter(
      t =>
        isSavingsConfirmTxn(t, activeBuckets) &&
        !t.isFlagged &&
        !t.isRecurringDraft,
    )
    .reduce((sum, t) => sum + t.amount, 0)
  const stillInBank = hasSalary ? Math.max(0, plannedSavings - confirmedSavings) : 0
  const plannedLeftover = hasSalary
    ? spendingPlan - lifestyleSpent - personalDraws + unallocated
    : 0
  const monthLeftover = plannedLeftover + stillInBank + lendingCashAdjust - fees

  return monthLeftover
}

/** Cash on hand for [start, end]. Today's borrow/spend must not be in this window. */
export async function cashOnHandForRange(
  start: Date,
  end: Date,
  carriedForward: number,
): Promise<number> {
  const prevTxns = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.date, start.toISOString()),
        lte(transactions.date, end.toISOString()),
      ),
    )
  const mappedTxns: Transaction[] = prevTxns.map(t => ({
    ...t,
    feeAmount: t.feeAmount ?? 0,
    merchant: t.merchant ?? null,
    parsedTxnId: t.parsedTxnId ?? null,
  }))
  const lendingRows = await db.select().from(lendBorrowEntries)
  const mappedLending: LendBorrowEntry[] = lendingRows.map(e => ({
    ...e,
    type: e.type as LendBorrowEntry['type'],
    note: e.note ?? null,
  }))
  const cash = periodCashFromTransactions(mappedTxns)
  return computeCashOnHand({
    carriedForward,
    income: cash.income,
    expenses: cash.expenses,
    fees: cash.fees,
    lendingCashAdjust: computeMonthMetrics(mappedLending, start, end).lendBorrowCashAdjust,
    // Found money stays on Your money for life; do not fold it into carry.
    foundThisPeriod: 0,
  })
}

export async function runSurplusRollover(
  monthStartDay: number,
  lastSurplusRolloverMonth: string | null | undefined,
  earlyMonthStartDate?: string | null,
  snapshot?: { cashOnHand: number },
): Promise<string> {
  const monthKey = currentMonthKey(monthStartDay, earlyMonthStartDate)
  if (lastSurplusRolloverMonth === monthKey && !snapshot) return monthKey

  const pbRows = await db.select().from(playbook).limit(1)
  if (pbRows.length === 0) return monthKey

  const pb = pbRows[0]

  let newCarry: number
  if (snapshot) {
    // Paid early: Your money on the card + today's items that stay in the new period.
    newCarry = Math.max(0, snapshot.cashOnHand)
  } else {
    const { start, end } = getPreviousMonthRange(
      monthStartDay,
      earlyMonthStartDate,
    )
    newCarry = await cashOnHandForRange(start, end, pb.carriedForwardBalance ?? 0)
  }

  await db
    .update(playbook)
    .set({
      carriedForwardBalance: newCarry,
      lastSurplusRolloverMonth: monthKey,
    })
    .where(eq(playbook.id, pb.id))

  return monthKey
}
