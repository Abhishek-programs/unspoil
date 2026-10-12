import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { getMonthRange, getDaysRemaining } from '@/lib/month'

export function usePulseData() {
  const { monthStartDay, monthlyIncome } = usePlaybookStore()
  const { getSpendingBuckets, getSavingsBuckets } = useBucketsStore()
  const {
    flaggedTransactions,
    getTotalIncome,
    getSpentByBucket,
    getConfirmedSavingsBuckets,
    addTransaction,
  } = useTransactionsStore()

  const spendingBuckets = getSpendingBuckets()
  const savingsBuckets = getSavingsBuckets()
  const confirmedSavingIds = getConfirmedSavingsBuckets()
  const { start } = getMonthRange(monthStartDay)

  // Spent per bucket
  const spentByBucket: Record<string, number> = {}
  spendingBuckets.forEach(b => { spentByBucket[b.id] = getSpentByBucket(b.id) })

  const totalIncome = getTotalIncome()
  const totalSpent = spendingBuckets.reduce((s, b) => s + (spentByBucket[b.id] ?? 0), 0)
  const flaggedAmount = flaggedTransactions.reduce((s, t) => s + t.amount, 0)

  const confirmedSavings = savingsBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)
  const unconfirmedSavings = savingsBuckets
    .filter(b => !confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)

  const available = totalIncome - totalSpent - confirmedSavings
  const daysRemaining = getDaysRemaining(monthStartDay)
  const weeksRemaining = Math.max(1, daysRemaining / 7)
  const weeklyRate = daysRemaining > 0 ? Math.max(0, available) / weeksRemaining : 0

  return {
    totalIncome,
    available,
    flaggedAmount,
    unconfirmedSavings,
    confirmedSavings,
    daysRemaining,
    weeklyRate,
    totalSpent,
    spendingBuckets,
    savingsBuckets,
    spentByBucket,
    confirmedSavingIds,
    monthStart: start,
    addTransaction,
  }
}
