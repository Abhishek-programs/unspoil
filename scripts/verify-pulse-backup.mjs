/**
 * Compare old vs new safe-to-spend from an UnSpoil backup JSON.
 * Usage: node scripts/verify-pulse-backup.mjs /path/to/backup.json
 */
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const root = new URL('..', import.meta.url).pathname

// Minimal copies — keep in sync with hooks/usePulseData.ts
const SALARY_BUCKET_ID = '_salary'
const PERSONAL_BUCKET_ID = 'personal'
const PERSONAL_RECOVERY_TOP_UP = 1000
const BANK_ACCOUNT_ID = 'bank'

function isSalaryTxn(t) {
  return t.type === 'income' && t.bucketId === SALARY_BUCKET_ID
}
function isFutureType(type) {
  return type === 'savings' || type === 'investment'
}
function isSavingsConfirmTxn(t, buckets) {
  if (t.type !== 'expense') return false
  return isFutureType(buckets.find(b => b.id === t.bucketId)?.type)
}

function spentTowardBucket(bucket, txns, allBuckets) {
  const futureIds = new Set(allBuckets.filter(b => isFutureType(b.type)).map(b => b.id))
  let spent = 0
  let putBack = 0
  for (const t of txns) {
    if (t.isFlagged || t.isRecurringDraft) continue
    if (t.type === 'income') {
      if (t.bucketId === bucket.id) putBack += t.amount
      continue
    }
    if (t.type !== 'expense') continue
    const destIsFuture = futureIds.has(t.bucketId)
    if (bucket.accumulates) {
      if (
        (t.bucketId === bucket.id && !destIsFuture) ||
        (t.fundedFromBucketId === bucket.id && destIsFuture)
      ) {
        spent += t.amount
      }
      continue
    }
    if (t.bucketId === bucket.id) spent += t.amount
    else if (t.fundedFromBucketId === bucket.id && destIsFuture) spent += t.amount
  }
  return Math.max(0, spent - putBack)
}

function periodCashFromTransactions(txns) {
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

function computeCashOnHand(args) {
  return Math.max(
    0,
    args.carriedForward +
      args.income -
      args.expenses -
      args.fees +
      args.lendingCashAdjust +
      args.foundThisPeriod,
  )
}

function parseLocalDate(value) {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

function dateAtMonthDay(year, month, day) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(day, lastDay), 0, 0, 0, 0)
}

function getNextRegularMonthStart(after, monthStartDay) {
  let candidate = dateAtMonthDay(after.getFullYear(), after.getMonth(), monthStartDay)
  if (candidate.getTime() <= after.getTime()) {
    candidate = dateAtMonthDay(after.getFullYear(), after.getMonth() + 1, monthStartDay)
  }
  return candidate
}

function getEarlyMonthEnd(earlyStart, monthStartDay) {
  const skipped = getNextRegularMonthStart(earlyStart, monthStartDay)
  const following = getNextRegularMonthStart(skipped, monthStartDay)
  return new Date(following.getTime() - 1)
}

function getMonthRange(monthStartDay, earlyMonthStartDate, now = new Date()) {
  if (earlyMonthStartDate) {
    const earlyStart = parseLocalDate(earlyMonthStartDate)
    const earlyEnd = getEarlyMonthEnd(earlyStart, monthStartDay)
    if (now >= earlyStart && now <= earlyEnd) {
      return { start: earlyStart, end: earlyEnd }
    }
  }
  const thisMonthStart = dateAtMonthDay(now.getFullYear(), now.getMonth(), monthStartDay)
  const start =
    now >= thisMonthStart
      ? thisMonthStart
      : dateAtMonthDay(now.getFullYear(), now.getMonth() - 1, monthStartDay)
  const nextStart = getNextRegularMonthStart(start, monthStartDay)
  return { start, end: new Date(nextStart.getTime() - 1) }
}

function inPeriod(iso, start, end) {
  const ms = new Date(iso).getTime()
  return ms >= start.getTime() && ms <= end.getTime()
}

export function computePulseFromPayload(payload, now) {
  const pb = payload.tables.playbook[0]
  const buckets = payload.tables.buckets.map(b => ({
    ...b,
    isActive: !!b.isActive,
    showOnHome: !!b.showOnHome,
    accumulates: !!b.accumulates,
  }))
  const allTx = payload.tables.transactions.map(t => ({
    ...t,
    isFlagged: !!t.isFlagged,
    isRecurringDraft: !!t.isRecurringDraft,
    feeAmount: t.feeAmount ?? 0,
  }))
  const accounts = payload.tables.accounts ?? []
  const adjustments = payload.tables.accountAdjustments ?? []
  const entries = payload.tables.lendBorrowEntries ?? []

  const { start, end } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate, now)
  const transactions = allTx.filter(t => inPeriod(t.date, start, end))

  const allSpending = buckets.filter(b => b.type === 'spending')
  const allSavings = buckets.filter(b => b.type === 'savings' || b.type === 'investment')
  const activeBuckets = buckets.filter(b => b.isActive)
  const accumulating = allSpending.filter(b => b.isActive && b.accumulates)
  const regular = allSpending.filter(b => b.isActive && !b.accumulates)

  const spentByBucket = {}
  for (const b of allSpending) {
    spentByBucket[b.id] = spentTowardBucket(b, transactions, buckets)
  }

  const personalDraws = accumulating.reduce((s, b) => s + (spentByBucket[b.id] ?? 0), 0)
  const personalRecoveryDebt = pb.personalRecoveryDebt ?? 0
  const personalTopUps = accumulating.reduce((s, b) => {
    if (b.id === PERSONAL_BUCKET_ID && personalRecoveryDebt > 0) return s + PERSONAL_RECOVERY_TOP_UP
    return s + b.monthlyAmount
  }, 0)
  const lifestyleBudget = regular.reduce((s, b) => s + b.monthlyAmount, 0)
  const lifestyleSpent = regular.reduce((s, b) => s + (spentByBucket[b.id] ?? 0), 0)

  const totalAllocations = activeBuckets.reduce((s, b) => s + b.monthlyAmount, 0)
  const plannedSavings = allSavings.filter(b => b.isActive).reduce((s, b) => s + b.monthlyAmount, 0)

  const hasSalary = transactions.some(t => isSalaryTxn(t))
  const salaryAmount = transactions.filter(isSalaryTxn).reduce((s, t) => s + t.amount, 0)
  const effectiveIncome = hasSalary ? salaryAmount || pb.monthlyIncome : 0

  const confirmedSavedInvested = transactions
    .filter(t => isSavingsConfirmTxn(t, buckets))
    .reduce((s, t) => s + t.amount, 0)

  const unallocatedAtStart = Math.max(0, effectiveIncome - totalAllocations)
  const spendingPlan = lifestyleBudget + personalTopUps

  const feesThisMonth = transactions
    .filter(t => t.type === 'expense' && !t.isFlagged && !t.isRecurringDraft)
    .reduce((s, t) => s + t.feeAmount, 0)

  const unconfirmedSavingsThisMonth = Math.max(0, plannedSavings - confirmedSavedInvested)
  const stillInBank = hasSalary ? unconfirmedSavingsThisMonth : 0
  const carriedForwardBalance = pb.carriedForwardBalance ?? 0

  // Lending adjust omitted (0 in most cases) — entries filtered by month in app
  const lendBorrowCashAdjust = 0
  const periodCash = periodCashFromTransactions(transactions)
  const foundThisPeriod = adjustments
    .filter(a => {
      const ms = new Date(a.date).getTime()
      return ms >= start.getTime() && ms <= end.getTime()
    })
    .reduce((s, a) => s + a.amount, 0)

  const bankPile = computeCashOnHand({
    carriedForward: carriedForwardBalance,
    income: periodCash.income,
    expenses: periodCash.expenses,
    fees: periodCash.fees,
    lendingCashAdjust: lendBorrowCashAdjust,
    foundThisPeriod,
  })
  const otherWallets = accounts.filter(a => a.id !== BANK_ACCOUNT_ID).reduce((s, a) => s + a.balance, 0)
  const yourMoney = bankPile + otherWallets

  const oldPlanSafe = hasSalary
    ? spendingPlan - lifestyleSpent - personalDraws + unallocatedAtStart
    : 0
  const oldAdjusted = oldPlanSafe + lendBorrowCashAdjust - feesThisMonth

  const newPlanSafe = hasSalary
    ? spendingPlan - lifestyleSpent - personalDraws + unallocatedAtStart
    : 0
  const newPlanAdjusted = newPlanSafe + lendBorrowCashAdjust - feesThisMonth
  const cashCeiling = Math.max(0, yourMoney - carriedForwardBalance - stillInBank)
  const newAdjusted = hasSalary ? Math.min(newPlanAdjusted, cashCeiling) : 0

  return {
    period: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`,
    hasSalary,
    effectiveIncome,
    yourMoney,
    carriedForwardBalance,
    stillInBank,
    confirmedSavedInvested,
    lifestyleSpent,
    personalDraws,
    spendingPlan,
    unallocatedAtStart,
    feesThisMonth,
    oldAdjusted,
    newAdjusted,
    newPlanAdjusted,
    cashCeiling,
    oldGtYourMoney: oldAdjusted > yourMoney,
    newGtYourMoney: newAdjusted > yourMoney,
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: node scripts/verify-pulse-backup.mjs <backup.json>')
    process.exit(1)
  }
  const payload = JSON.parse(fs.readFileSync(path, 'utf8'))
  const asOfExport = new Date(payload.exportedAt)
  const asOfNow = new Date()

  console.log('=== As of backup export time ===')
  console.log(JSON.stringify(computePulseFromPayload(payload, asOfExport), null, 2))
  console.log('\n=== As of today (current playbook month) ===')
  console.log(JSON.stringify(computePulseFromPayload(payload, asOfNow), null, 2))
}
