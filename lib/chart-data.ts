import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { and, gte, lte, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'

export interface MonthlySpend {
  month: string // "Jan", "Feb", etc.
  monthKey: string // "2026-04"
  total: number
  isCurrent: boolean
}

/**
 * Loads total lifestyle (expense) spend per month for the last N months.
 * Uses calendar months for simplicity in chart display.
 */
export async function getMonthlySpendHistory(months: number): Promise<MonthlySpend[]> {
  const now = new Date()
  const currentKey = format(now, 'yyyy-MM')
  const result: MonthlySpend[] = []

  for (let i = months - 1; i >= 0; i--) {
    const target = subMonths(now, i)
    const start = startOfMonth(target)
    const end = endOfMonth(target)
    const monthKey = format(target, 'yyyy-MM')
    const label = format(target, 'MMM')

    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, start.toISOString()),
          lte(transactions.date, end.toISOString()),
          eq(transactions.type, 'expense'),
        )
      )

    const total = rows
      .filter(r => !r.isFlagged && !r.isRecurringDraft)
      .reduce((sum, r) => sum + r.amount, 0)

    result.push({
      month: label,
      monthKey,
      total,
      isCurrent: monthKey === currentKey,
    })
  }

  return result
}
