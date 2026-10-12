import type { Transaction } from '@/store/transactions'
import { roundPaisa } from '@/lib/format'

/** Cash that actually moved in a period — not leftover budget. */
export function periodCashFromTransactions(txns: Transaction[]): {
  income: number
  expenses: number
  fees: number
} {
  let income = 0
  let expenses = 0
  let fees = 0
  for (const t of txns) {
    if (t.isRecurringDraft) continue
    if (t.type === 'income') {
      income += t.amount
      continue
    }
    expenses += t.amount
    fees += t.feeAmount ?? 0
  }
  return { income, expenses, fees }
}

export function computeCashOnHand(args: {
  carriedForward: number
  income: number
  expenses: number
  fees: number
  lendingCashAdjust: number
  foundThisPeriod: number
}): number {
  return Math.max(
    0,
    roundPaisa(
      args.carriedForward +
        args.income -
        args.expenses -
        args.fees +
        args.lendingCashAdjust +
        args.foundThisPeriod,
    ),
  )
}

/** Today's cash that will be counted again after the period cut. */
export function movedIntoNewPeriodAdjust(
  txns: Transaction[],
  lendingCashAdjustToday: number,
  newPeriodStart: Date,
): number {
  const startMs = newPeriodStart.getTime()
  let addBack = 0
  for (const t of txns) {
    if (t.isRecurringDraft) continue
    if (new Date(t.date).getTime() < startMs) continue
    if (t.type === 'expense') addBack += t.amount + (t.feeAmount ?? 0)
    else addBack -= t.amount
  }
  // Borrow/lend today is re-applied in the new period — do not keep it in carry.
  return addBack - lendingCashAdjustToday
}

function isIncomeShadowAdjustment(note: string | null | undefined): boolean {
  return note === 'Income' || note === 'Income reversed'
}

export function foundMoneyInRange(
  adjustments: { amount: number; date: string; note?: string | null }[],
  start: Date,
  end: Date,
): number {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return adjustments.reduce((sum, a) => {
    if (isIncomeShadowAdjustment(a.note)) return sum
    const ms = new Date(a.date).getTime()
    if (ms < startMs || ms > endMs) return sum
    return sum + a.amount
  }, 0)
}

