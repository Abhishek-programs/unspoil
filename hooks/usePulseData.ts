import { usePlaybookStore } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { useLendingStore } from '@/store/lending'
import { useAccountsStore } from '@/store/accounts'
import { getMonthRange, getDaysRemaining } from '@/lib/month'
import { computeMonthMetrics } from '@/lib/lending/balance'
import { computeCashOnHand, foundMoneyInRange, periodCashFromTransactions } from '@/lib/your-money'
import {
  EF_BUCKET_ID,
  PERSONAL_BUCKET_ID,
  SIP_BUCKET_ID,
  SHARES_BUCKET_ID,
} from '@/constants/defaults'
import { PERSONAL_RECOVERY_TOP_UP } from '@/lib/bucket-balance'
import { BANK_ACCOUNT_ID } from '@/constants/accounts'
import { isSalaryTxn, isSavingsConfirmTxn } from '@/lib/txn-kind'

export function usePulseData() {
  const {
    monthStartDay,
    earlyMonthStartDate,
    monthlyIncome,
    efStartBalance,
    carriedForwardBalance,
    personalRecoveryDebt,
  } = usePlaybookStore()
  const { buckets, bucketBalances } = useBucketsStore()
  const {
    flaggedTransactions,
    getTotalIncome,
    getSpentByBucket,
    getConfirmedSavingsBuckets,
    addTransaction,
    transactions,
    allTransactions,
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
  const { start, end } = getMonthRange(monthStartDay, earlyMonthStartDate)

  const spentByBucket: Record<string, number> = {}
  allSpendingBuckets.forEach(b => {
    spentByBucket[b.id] = getSpentByBucket(b.id)
  })

  const accumulatingBuckets = allSpendingBuckets.filter(b => b.isActive && b.accumulates)
  const regularSpendingBuckets = allSpendingBuckets.filter(b => b.isActive && !b.accumulates)

  const personalDraws = accumulatingBuckets.reduce((s, b) => s + (spentByBucket[b.id] ?? 0), 0)

  const personalTopUps = accumulatingBuckets.reduce((s, b) => {
    if (b.id === PERSONAL_BUCKET_ID && personalRecoveryDebt > 0) {
      return s + PERSONAL_RECOVERY_TOP_UP
    }
    return s + b.monthlyAmount
  }, 0)
  const lifestyleBudget = regularSpendingBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const totalIncome = getTotalIncome()
  const lifestyleSpent = regularSpendingBuckets.reduce(
    (s, b) => s + (spentByBucket[b.id] ?? 0),
    0,
  )
  const flaggedAmount = flaggedTransactions.reduce((s, t) => s + t.amount, 0)
  const feesThisMonth = transactions
    .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
    .reduce((s, t) => s + t.feeAmount, 0)

  const totalAllocations = activeBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const plannedSavings = allSavingsBuckets
    .filter(b => b.isActive)
    .reduce((s, b) => s + b.monthlyAmount, 0)

  const savingsOnlyBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'savings')
  const investmentBuckets = allSavingsBuckets.filter(b => b.isActive && b.type === 'investment')

  const plannedSavingsOnly = savingsOnlyBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const plannedInvestment = investmentBuckets.reduce((s, b) => s + b.monthlyAmount, 0)

  const hasSalaryThisMonth = transactions.some(
    t => isSalaryTxn(t) && !t.isRecurringDraft,
  )
  const salaryAmount = transactions
    .filter(t => isSalaryTxn(t) && !t.isRecurringDraft)
    .reduce((sum, t) => sum + t.amount, 0)
  const effectiveIncome = hasSalaryThisMonth ? salaryAmount || monthlyIncome : 0

  const confirmedSavedInvested = transactions
    .filter(t => isSavingsConfirmTxn(t, buckets))
    .reduce((s, t) => s + t.amount, 0)

  const confirmedSavingsOnly = savingsOnlyBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => s + b.monthlyAmount, 0)

  const confirmedInvestment = investmentBuckets
    .filter(b => confirmedSavingIds.has(b.id))
    .reduce((s, b) => {
      const actual = transactions
        .filter(t => t.bucketId === b.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
      return s + actual
    }, 0)

  const confirmedSavings = confirmedSavingsOnly + confirmedInvestment

  const stillToSave = Math.max(0, plannedSavingsOnly - confirmedSavingsOnly)
  const stillToInvest = Math.max(0, plannedInvestment - confirmedInvestment)
  const unconfirmedSavings = Math.max(0, plannedSavings - confirmedSavings)

  const unallocatedAtStart = Math.max(0, effectiveIncome - totalAllocations)

  const unconfirmedSavingsThisMonth = Math.max(0, plannedSavings - confirmedSavedInvested)
  const stillInBank = hasSalaryThisMonth ? unconfirmedSavingsThisMonth : 0

  const lendBorrowMonth = computeMonthMetrics(allEntries, start, end)
  const lendBorrowCashAdjust = lendBorrowMonth.lendBorrowCashAdjust
  const lentOutstandingThisMonth = lendBorrowMonth.lentOutstandingThisMonth

  const { foundMoneyTotal, accounts: moneyAccounts, adjustments } = useAccountsStore()
  const periodCash = periodCashFromTransactions(transactions)
  const bankPile = computeCashOnHand({
    carriedForward: carriedForwardBalance,
    income: periodCash.income,
    expenses: periodCash.expenses,
    fees: periodCash.fees,
    lendingCashAdjust: lendBorrowCashAdjust,
    foundThisPeriod: foundMoneyInRange(adjustments, start, end),
  })
  const otherWallets = moneyAccounts
    .filter(a => a.id !== BANK_ACCOUNT_ID)
    .reduce((s, a) => s + a.balance, 0)
  const yourMoney = bankPile + otherWallets

  // Living/Personal plan remaining + unallocated salary (Future is not in spendingPlan)
  const spendingPlan = lifestyleBudget + personalTopUps
  const planSafeToSpend = hasSalaryThisMonth
    ? spendingPlan - lifestyleSpent - personalDraws + unallocatedAtStart
    : 0

  const planAdjustedSafe =
    planSafeToSpend + lendBorrowCashAdjust - feesThisMonth
  const cashSpendableCeiling = Math.max(
    0,
    yourMoney - carriedForwardBalance - stillInBank,
  )
  const adjustedSafeToSpend = hasSalaryThisMonth
    ? Math.min(planAdjustedSafe, cashSpendableCeiling)
    : 0
  const safeToSpend = adjustedSafeToSpend

  const availableBalance = Math.max(0, adjustedSafeToSpend + carriedForwardBalance)
  const monthRemainingBalance = adjustedSafeToSpend

  const daysRemaining = getDaysRemaining(monthStartDay, earlyMonthStartDate)
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
    ? allTransactions
        .filter(t => t.bucketId === efBucket.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)
    : 0

  const systemBucketIds = new Set([SIP_BUCKET_ID, SHARES_BUCKET_ID, EF_BUCKET_ID])
  const activeGoals = goals.filter(g => g.isEnabled && !g.completedAt)

  const goalValue = (g: (typeof goals)[0]) => {
    const current = allTransactions
      .filter(t => g.linkedBucketIds.includes(t.bucketId) && t.type === 'expense')
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
    : allTransactions
        .filter(t => t.bucketId === SIP_BUCKET_ID && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

  const sharesLifetime = sharesGoal
    ? goalValue(sharesGoal)
    : allTransactions
        .filter(t => t.bucketId === SHARES_BUCKET_ID && t.type === 'expense')
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
    yourMoney,
    bankPile,
    stillInBank,
    safeToSpend: adjustedSafeToSpend,
    rawSafeToSpend: planSafeToSpend,
    monthRemainingBalance,
    carriedForwardBalance,
    lendBorrowCashAdjust,
    lentOutstandingThisMonth,
    totalNetLending,
    lentOutAsset,
    youOweLiability,
    lendingContactCount: contacts.length,
    unallocatedAtStart,
    actualSafeToSpend: planSafeToSpend,
    safeBeforeInvestments: safeToSpend + confirmedSavedInvested,
    plannedSavings,
    plannedSavingsOnly,
    plannedInvestment,
    totalAllocations,
    savingsSetAside: plannedSavings,
    flaggedAmount,
    feesThisMonth,
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
    moneyAccounts,
    foundMoneyTotal,
  }
}
