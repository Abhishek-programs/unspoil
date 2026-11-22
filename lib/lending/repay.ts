import { balanceBeforeEntry, type Contact, type LendBorrowEntry } from '@/lib/lending/balance'

export type RepayDue = {
  contactId: string
  name: string
  monthly: number
  /** What you owed them when this period started. */
  owedAtStart: number
  paidThisPeriod: number
  /** Still to pay back this period under the plan. */
  due: number
}

/** You-owe balance (positive) for one person from entries dated before `before`. */
function owedBefore(contactId: string, entries: LendBorrowEntry[], before: Date): number {
  const ms = before.getTime()
  let balance = 0
  const sorted = entries
    .filter(e => e.contactId === contactId && new Date(e.date).getTime() < ms)
    .sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime()
      return d !== 0 ? d : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  for (const e of sorted) {
    if (e.type === 'lend') balance += e.amount
    else if (e.type === 'borrow') balance -= e.amount
    else if (balance > 0) balance -= e.amount
    else if (balance < 0) balance += e.amount
  }
  return balance < 0 ? -balance : 0
}

/**
 * Borrow repayment plans for [start, end]. A borrow made this period starts
 * repaying next period; repayments already made this period count toward it.
 */
export function computeRepayDue(
  contacts: Contact[],
  entries: LendBorrowEntry[],
  start: Date,
  end: Date,
): { rows: RepayDue[]; totalDue: number; totalMonthly: number } {
  const startMs = start.getTime()
  const endMs = end.getTime()
  const rows: RepayDue[] = []
  for (const c of contacts) {
    const monthly = c.repayMonthly ?? 0
    if (monthly <= 0) continue
    const owedAtStart = owedBefore(c.id, entries, start)
    const paidThisPeriod = entries
      .filter(e => {
        if (e.contactId !== c.id || e.type !== 'settle') return false
        const ms = new Date(e.date).getTime()
        return ms >= startMs && ms <= endMs && balanceBeforeEntry(c.id, entries, e.id) < 0
      })
      .reduce((s, e) => s + e.amount, 0)
    const due = Math.max(0, Math.min(monthly, owedAtStart) - paidThisPeriod)
    if (owedAtStart <= 0 && due <= 0) continue
    rows.push({ contactId: c.id, name: c.name, monthly, owedAtStart, paidThisPeriod, due })
  }
  return {
    rows,
    totalDue: rows.reduce((s, r) => s + r.due, 0),
    totalMonthly: rows.reduce((s, r) => s + Math.min(r.monthly, r.owedAtStart), 0),
  }
}
