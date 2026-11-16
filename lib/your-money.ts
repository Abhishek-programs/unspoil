import type { Transaction } from '@/store/transactions'
import { roundPaisa } from '@/lib/format'
import { BANK_ACCOUNT_ID } from '@/constants/accounts'

// eSewa and Cash keep their own running balances; only Bank is derived from the
// ledger, so a transaction on another wallet must stay out of the Bank pile.
function isBankWallet(accountId: string | null | undefined): boolean {
  return !accountId || accountId === BANK_ACCOUNT_ID
}

/** Bank cash that actually moved in a period — not leftover budget. */
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
    if (!isBankWallet(t.accountId)) continue
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
  bankTransfersNet?: number
}): number {
  return Math.max(
    0,
    roundPaisa(
      args.carriedForward +
        args.income -
        args.expenses -
        args.fees +
        args.lendingCashAdjust +
        args.foundThisPeriod +
        (args.bankTransfersNet ?? 0),
    ),
  )
}

/** Today's cash that will be counted again after the period cut. */
export function movedIntoNewPeriodAdjust(
  txns: Transaction[],
  lendingCashAdjustToday: number,
  newPeriodStart: Date,
  bankTransfersNetToday = 0,
): number {
  const startMs = newPeriodStart.getTime()
  let addBack = 0
  for (const t of txns) {
    if (t.isRecurringDraft) continue
    if (!isBankWallet(t.accountId)) continue
    if (new Date(t.date).getTime() < startMs) continue
    if (t.type === 'expense') addBack += t.amount + (t.feeAmount ?? 0)
    else addBack -= t.amount
  }
  // Borrow/lend today is re-applied in the new period — do not keep it in carry.
  return addBack - lendingCashAdjustToday - bankTransfersNetToday
}

/** Moves between wallets: into Bank minus out of Bank, within [start, end]. */
export function bankTransfersNetInRange(
  transfers: { fromAccountId: string; toAccountId: string; amount: number; date: string }[],
  start: Date,
  end: Date,
): number {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return transfers.reduce((sum, t) => {
    const ms = new Date(t.date).getTime()
    if (ms < startMs || ms > endMs) return sum
    if (t.toAccountId === BANK_ACCOUNT_ID) sum += t.amount
    if (t.fromAccountId === BANK_ACCOUNT_ID) sum -= t.amount
    return sum
  }, 0)
}

function isIncomeShadowAdjustment(note: string | null | undefined): boolean {
  return note === 'Income' || note === 'Income reversed'
}

export function foundMoneyInRange(
  adjustments: { amount: number; date: string; note?: string | null; accountId?: string | null }[],
  start: Date,
  end: Date,
): number {
  const startMs = start.getTime()
  const endMs = end.getTime()
  return adjustments.reduce((sum, a) => {
    if (isIncomeShadowAdjustment(a.note)) return sum
    if (!isBankWallet(a.accountId)) return sum
    const ms = new Date(a.date).getTime()
    if (ms < startMs || ms > endMs) return sum
    return sum + a.amount
  }, 0)
}

