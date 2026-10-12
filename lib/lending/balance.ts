export type LendBorrowType = 'lend' | 'borrow' | 'settle'

export interface LendBorrowEntry {
  id: string
  contactId: string
  type: LendBorrowType
  amount: number
  note: string | null
  date: string
  createdAt: string
}

export interface Contact {
  id: string
  name: string
  createdAt: string
}

function entrySort(a: LendBorrowEntry, b: LendBorrowEntry) {
  const d = new Date(a.date).getTime() - new Date(b.date).getTime()
  if (d !== 0) return d
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
}

export function computePersonBalance(
  contactId: string,
  entries: LendBorrowEntry[],
): number {
  const sorted = entries
    .filter(e => e.contactId === contactId)
    .sort(entrySort)

  let balance = 0
  for (const e of sorted) {
    if (e.type === 'lend') balance += e.amount
    else if (e.type === 'borrow') balance -= e.amount
    else if (e.type === 'settle') {
      if (balance > 0) balance -= e.amount
      else if (balance < 0) balance += e.amount
    }
  }
  return balance
}

export function balanceBeforeEntry(
  contactId: string,
  entries: LendBorrowEntry[],
  beforeEntryId: string,
): number {
  const sorted = entries.filter(e => e.contactId === contactId).sort(entrySort)
  let balance = 0
  for (const e of sorted) {
    if (e.id === beforeEntryId) break
    if (e.type === 'lend') balance += e.amount
    else if (e.type === 'borrow') balance -= e.amount
    else if (e.type === 'settle') {
      if (balance > 0) balance -= e.amount
      else if (balance < 0) balance += e.amount
    }
  }
  return balance
}

export interface MonthLendBorrowMetrics {
  lentThisMonth: number
  borrowedThisMonth: number
  settleReceivedThisMonth: number
  settlePaidThisMonth: number
  lentOutstandingThisMonth: number
  lendBorrowCashAdjust: number
}

export function computeMonthMetrics(
  entries: LendBorrowEntry[],
  monthStart: Date,
  monthEnd: Date,
): MonthLendBorrowMetrics {
  const startMs = monthStart.getTime()
  const endMs = monthEnd.getTime()

  const inMonth = entries.filter(e => {
    const t = new Date(e.date).getTime()
    return t >= startMs && t <= endMs
  })

  let lentThisMonth = 0
  let borrowedThisMonth = 0
  let settleReceivedThisMonth = 0
  let settlePaidThisMonth = 0

  for (const e of inMonth.sort(entrySort)) {
    if (e.type === 'lend') lentThisMonth += e.amount
    else if (e.type === 'borrow') borrowedThisMonth += e.amount
    else if (e.type === 'settle') {
      const before = balanceBeforeEntry(e.contactId, entries, e.id)
      if (before > 0) settleReceivedThisMonth += e.amount
      else if (before < 0) settlePaidThisMonth += e.amount
    }
  }

  const lentOutstandingThisMonth = Math.max(0, lentThisMonth - settleReceivedThisMonth)
  const lendBorrowCashAdjust =
    -lentThisMonth + borrowedThisMonth + settleReceivedThisMonth - settlePaidThisMonth

  return {
    lentThisMonth,
    borrowedThisMonth,
    settleReceivedThisMonth,
    settlePaidThisMonth,
    lentOutstandingThisMonth,
    lendBorrowCashAdjust,
  }
}

export function entryCashDelta(entry: LendBorrowEntry, allEntries: LendBorrowEntry[]): number {
  if (entry.type === 'lend') return -entry.amount
  if (entry.type === 'borrow') return entry.amount
  if (entry.type === 'settle') {
    const before = balanceBeforeEntry(entry.contactId, allEntries, entry.id)
    if (before > 0) return entry.amount
    if (before < 0) return -entry.amount
  }
  return 0
}

export function computeTotalNetBalance(
  contacts: Contact[],
  entries: LendBorrowEntry[],
): number {
  return contacts.reduce((sum, c) => sum + computePersonBalance(c.id, entries), 0)
}

export function computeLentOutAsset(
  contacts: Contact[],
  entries: LendBorrowEntry[],
): number {
  return contacts.reduce((sum, c) => {
    const b = computePersonBalance(c.id, entries)
    return sum + (b > 0 ? b : 0)
  }, 0)
}

export function computeYouOweLiability(
  contacts: Contact[],
  entries: LendBorrowEntry[],
): number {
  return contacts.reduce((sum, c) => {
    const b = computePersonBalance(c.id, entries)
    return sum + (b < 0 ? Math.abs(b) : 0)
  }, 0)
}

export function balanceDirection(balance: number): 'owes_you' | 'you_owe' | 'settled' {
  if (balance > 0) return 'owes_you'
  if (balance < 0) return 'you_owe'
  return 'settled'
}

export function directionLabel(balance: number): string {
  if (balance > 0) return 'owes you'
  if (balance < 0) return 'you owe'
  return 'settled'
}
