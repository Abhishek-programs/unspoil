import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
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
    transactions,
  } = useTransactionsStore()
  const { goals } = useGoalsStore()

  const allSpendingBuckets = getSpendingBuckets()
  const allSavingsBuckets = getSavingsBuckets()
  
  const spendingBuckets = allSpendingBuckets.filter(b => b.showOnHome)
  const savingsBuckets = allSavingsBuckets.filter(b => b.showOnHome)
  
  const confirmedSavingIds = getConfirmedSavingsBuckets()
  const { start } = getMonthRange(monthStartDay)
 
  // Spent per bucket
  const spentByBucket: Record<string, number> = {}
  allSpendingBuckets.forEach(b => { spentByBucket[b.id] = getSpentByBucket(b.id) })
 
  const totalIncome = getTotalIncome()
  const totalSpent = allSpendingBuckets.reduce((s, b) => s + (spentByBucket[b.id] ?? 0), 0)
  const flaggedAmount = flaggedTransactions.reduce((s, t) => s + t.amount, 0)
 
  const confirmedSavings = allSavingsBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)
  const unconfirmedSavings = allSavingsBuckets
    .filter(b => !confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)
 
  const available = totalIncome - totalSpent - confirmedSavings
  const daysRemaining = getDaysRemaining(monthStartDay)
  const weeksRemaining = Math.max(1, daysRemaining / 7)
  const weeklyRate = daysRemaining > 0 ? Math.max(0, available) / weeksRemaining : 0

  // Net Worth calculations
  const goalBalances = goals.map(g => {
    const current = transactions
      .filter(t => g.linkedBucketIds.includes(t.bucketId))
      .reduce((sum, t) => sum + t.amount, 0)
    return { name: g.name, value: g.startBalance + current }
  })

  const totalAssets = goalBalances.reduce((sum, g) => sum + g.value, 0)
  const totalLiabilities = 0 // V1: manual liabilities not yet implemented in store
  const netWorth = totalAssets - totalLiabilities
  const monthGrowth = confirmedSavings // In V1, growth is driven by confirmed savings contributions
  const savingsRate = totalIncome > 0 ? (confirmedSavings / totalIncome) * 100 : 0

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
    netWorth,
    monthGrowth,
    totalAssets,
    totalLiabilities,
    savingsRate,
    assetBreakdown: goalBalances,
  }
}
