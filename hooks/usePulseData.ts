import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { useLendingStore } from '@/store/lending'
import { getMonthRange, getDaysRemaining } from '@/lib/month'
import { computeMonthMetrics } from '@/lib/lending/balance'
import { EF_BUCKET_ID, SIP_BUCKET_ID, SHARES_BUCKET_ID } from '@/constants/defaults'

export function usePulseData() {
  const { monthStartDay, monthlyIncome, efStartBalance, carriedForwardBalance } = usePlaybookStore()
  const { buckets, bucketBalances } = useBucketsStore()
  const {
    flaggedTransactions,
    getTotalIncome,
    getSpentByBucket,
    getConfirmedSavingsBuckets,
    addTransaction,
    transactions,
  } = useTransactionsStore()
  const { goals } = useGoalsStore()
  const { allEntries, contacts, getLentOutTotal, getYouOweTotal, getTotalNetBalance } =
    useLendingStore()

  const activeBuckets = buckets.filter(b => b.isActive)
  const allSpendingBuckets = buckets.filter(b => b.type === 'spending')
  const allSavingsBuckets = buckets.filter(b => b.type === 'savings' || b.type === 'investment')

  const spendingBuckets = allSpendingBuckets.filter(b => b.isActive && b.showOnHome)
  const savingsBuckets = allSavingsBuckets.filter(b => b.isActive && b.showOnHome)

  const confirmedSavingIds = getConfirmedSavingsBuckets()
  const { start, end } = getMonthRange(monthStartDay)

  const spentByBucket: Record<string, number> = {}
  allSpendingBuckets.forEach(b => {
    spentByBucket[b.id] = getSpentByBucket(b.id)
  })

  const accumulatingBuckets = allSpendingBuckets.filter(b => b.isActive && b.accumulates)
  const regularSpendingBuckets = allSpendingBuckets.filter(b => b.isActive && !b.accumulates)

  const personalDraws = accumulatingBuckets.reduce((s, b) => {
    return (
      s +
      transactions
        .filter(
          t =>
            t.type === 'expense' &&
            !t.isFlagged &&
            !t.isRecurringDraft &&
            ((t.bucketId === b.id && (!t.remarks || !t.remarks.startsWith('__'))) ||
              (t.fundedFromBucketId === b.id && t.remarks === '__savings_confirm__')),
        )
        .reduce((sum, t) => sum + t.amount, 0)
    )
  }, 0)

  const personalTopUps = accumulatingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const lifestyleBudget = regularSpendingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const totalIncome = getTotalIncome()
  const lifestyleSpent = regularSpendingBuckets.reduce(
    (s, b) => s + (spentByBucket[b.id] ?? 0),
    0,
  )
  const flaggedAmount = flaggedTransactions.reduce((s, t) => s + t.amount, 0)

  const totalAllocations = activeBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const plannedSavings = allSavingsBuckets
    .filter(b => b.isActive)
    .reduce((s, b) => s + b.monthlyAmount, 0)

  const savingsOnlyBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'savings')
  const investmentBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'investment')

  const plannedSavingsOnly = savingsOnlyBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const plannedInvestment = investmentBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const hasSalaryThisMonth = transactions.some(
    t => t.type === 'income' && t.remarks === '__salary__' && !t.isRecurringDraft,
  )
  const salaryAmount = transactions
    .filter(t => t.type === 'income' && t.remarks === '__salary__' && !t.isRecurringDraft)
    .reduce((sum, t) => sum + t.amount, 0)
  const effectiveIncome = hasSalaryThisMonth ? salaryAmount || monthlyIncome : 0

  const confirmedSavedInvested = transactions
    .filter(t => t.remarks === '__savings_confirm__' && t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)

  const confirmedSavingsOnly = savingsOnlyBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)

  const confirmedInvestment = investmentBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => {
      const actual = transactions
        .filter(t => t.bucketId === b.id && t.remarks === '__savings_confirm__')
        .reduce((sum, t) => sum + t.amount, 0)
      return s + actual
    }, 0)

  const confirmedSavings = confirmedSavingsOnly + confirmedInvestment

  const stillToSave = Math.max(0, plannedSavingsOnly - confirmedSavingsOnly)
  const stillToInvest = Math.max(0, plannedInvestment - confirmedInvestment)
  const unconfirmedSavings = Math.max(0, plannedSavings - confirmedSavings)

  const unallocatedAtStart = Math.max(0, effectiveIncome - totalAllocations)

  // Spendable = lifestyle bucket budgets remaining + any income not yet assigned to buckets
  const spendingPlan = lifestyleBudget + personalTopUps
  const safeToSpend = hasSalaryThisMonth
    ? spendingPlan - lifestyleSpent - personalDraws + unallocatedAtStart
    : 0

  const lendBorrowMonth = computeMonthMetrics(allEntries, start, end)
  const lendBorrowCashAdjust = lendBorrowMonth.lendBorrowCashAdjust
  const adjustedSafeToSpend = safeToSpend + lendBorrowCashAdjust
  const lentOutstandingThisMonth = lendBorrowMonth.lentOutstandingThisMonth

  const unconfirmedSavingsThisMonth = Math.max(0, plannedSavings - confirmedSavedInvested)

  const availableBalance = Math.max(0, adjustedSafeToSpend) + carriedForwardBalance
  const monthRemainingBalance = Math.max(0, adjustedSafeToSpend)

  const daysRemaining = getDaysRemaining(monthStartDay)
  const weeksRemaining = Math.max(1, daysRemaining / 7)
  const weeklyRate =
    daysRemaining > 0 ? Math.max(0, adjustedSafeToSpend) / weeksRemaining : 0

  const totalNetLending = getTotalNetBalance()
  const lentOutAsset = getLentOutTotal()
  const youOweLiability = getYouOweTotal()

  const totalSpent = lifestyleSpent
  const monthlySpendAllowance = lifestyleBudget + personalTopUps

  const efBucket = buckets.find(b => b.id === EF_BUCKET_ID)
  const efContributions = efBucket
    ? transactions
        .filter(t => t.bucketId === efBucket.id && t.remarks === '__savings_confirm__')
        .reduce((sum, t) => sum + t.amount, 0)
    : 0

  const systemBucketIds = new Set([SIP_BUCKET_ID, SHARES_BUCKET_ID, EF_BUCKET_ID])
  const activeGoals = goals.filter(g => g.isEnabled && !g.completedAt)

  const goalValue = (g: (typeof goals)[0]) => {
    const current = transactions
      .filter(t => g.linkedBucketIds.includes(t.bucketId) && t.remarks === '__savings_confirm__')
      .reduce((sum, t) => sum + t.amount, 0)
    return g.startBalance + current
  }

  const bigSpendGoals = activeGoals.filter(
    g => !g.linkedBucketIds.some(id => systemBucketIds.has(id)),
  )
  const goalBalances = bigSpendGoals.map(g => ({ name: g.name, value: goalValue(g) }))

  const sipGoal = activeGoals.find(g => g.linkedBucketIds.includes(SIP_BUCKET_ID))
  const sharesGoal = activeGoals.find(g => g.linkedBucketIds.includes(SHARES_BUCKET_ID))

  const sipLifetime = sipGoal
    ? goalValue(sipGoal)
    : transactions
        .filter(t => t.bucketId === SIP_BUCKET_ID && t.remarks === '__savings_confirm__')
        .reduce((sum, t) => sum + t.amount, 0)

  const sharesLifetime = sharesGoal
    ? goalValue(sharesGoal)
    : transactions
        .filter(t => t.bucketId === SHARES_BUCKET_ID && t.remarks === '__savings_confirm__')
        .reduce((sum, t) => sum + t.amount, 0)

  const efValue = efStartBalance + efContributions

  const assetBreakdown = [
    ...(efValue > 0 || efStartBalance > 0 ? [{ name: 'Emergency Fund', value: efValue }] : []),
    ...goalBalances,
    ...(sipLifetime > 0 ? [{ name: 'SIPs', value: sipLifetime }] : []),
    ...(sharesLifetime > 0 ? [{ name: 'Direct Shares', value: sharesLifetime }] : []),
  ]

  const intentionalSavings = assetBreakdown.reduce((sum, g) => sum + g.value, 0)
  const totalAssets = intentionalSavings
  const totalLiabilities = 0
  const netWorth = intentionalSavings
  const monthGrowth = confirmedSavedInvested
  const savingsRate = totalIncome > 0 ? (confirmedSavedInvested / totalIncome) * 100 : 0
  const hasAnyData = intentionalSavings > 0 || transactions.length > 0

  return {
    totalIncome,
    monthlyIncome,
    effectiveIncome,
    hasSalaryThisMonth,
    availableBalance,
    safeToSpend: adjustedSafeToSpend,
    rawSafeToSpend: safeToSpend,
    monthRemainingBalance,
    carriedForwardBalance,
    lendBorrowCashAdjust,
    lentOutstandingThisMonth,
    totalNetLending,
    lentOutAsset,
    youOweLiability,
    lendingContactCount: contacts.length,
    unallocatedAtStart,
    actualSafeToSpend: safeToSpend,
    safeBeforeInvestments: safeToSpend + confirmedSavedInvested,
    plannedSavings,
    plannedSavingsOnly,
    plannedInvestment,
    totalAllocations,
    savingsSetAside: plannedSavings,
    flaggedAmount,
    unconfirmedSavings,
    stillToSave,
    stillToInvest,
    confirmedSavings,
    confirmedSavingsOnly,
    confirmedInvestment,
    confirmedSavedInvested,
    unconfirmedSavingsThisMonth,
    daysRemaining,
    weeklyRate,
    totalSpent,
    lifestyleSpent,
    lifestyleBudget,
    monthlySpendAllowance,
    personalTopUps,
    personalDraws,
    totalInvested: confirmedInvestment,
    spendingBuckets,
    savingsBuckets,
    spentByBucket,
    bucketBalances,
    confirmedSavingIds,
    monthStart: start,
    addTransaction,
    netWorth,
    intentionalSavings,
    monthGrowth,
    totalAssets,
    totalLiabilities,
    savingsRate,
    assetBreakdown,
    hasAnyData,
    efValue,
    efStartBalance,
    sipInvested: sipLifetime,
    sharesInvested: sharesLifetime,
  }
}
