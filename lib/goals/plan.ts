import { addMonths, format } from 'date-fns'

export type PaymentMode = 'pay_in_full' | 'upfront_emi'
export type GoalBucketRole = 'full' | 'upfront' | 'emi_reserve'

export const GOAL_BUCKET_LABELS: Record<
  GoalBucketRole,
  { title: string; hint: string }
> = {
  full: {
    title: 'Savings',
    hint: 'Monthly savings toward your goal',
  },
  upfront: {
    title: 'Pay upfront',
    hint: 'Saving for down payment before you buy',
  },
  emi_reserve: {
    title: 'EMI reserve',
    hint: 'Setting aside money for payments after you buy',
  },
}

export function monthsBetween(from: Date, to: Date): number {
  return Math.max(1, (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()))
}

export function backCalcMonthly(target: number, alreadySaved: number, months: number): number {
  return Math.ceil(Math.max(0, target - alreadySaved) / months)
}

export function projectDateFromMonthly(
  targetAmount: number,
  alreadySaved: number,
  monthly: number
): string {
  if (monthly <= 0) return format(addMonths(new Date(), 120), 'yyyy-MM')
  const remaining = Math.max(0, targetAmount - alreadySaved)
  const months = Math.ceil(remaining / monthly)
  return format(addMonths(new Date(), months), 'yyyy-MM')
}

export function parseTargetDate(targetDate: string | null, fallbackMonths = 18): Date {
  if (targetDate) {
    const parts = targetDate.split('-')
    if (parts.length >= 2) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1)
    }
  }
  return addMonths(new Date(), fallbackMonths)
}

export interface GoalPlanBucket {
  role: GoalBucketRole
  monthlyAmount: number
  subTarget?: number
}

export interface GoalPlanResult {
  totalMonthly: number
  projectedTargetDate: string
  buckets: GoalPlanBucket[]
}

export function computeGoalPlan(input: {
  targetAmount: number
  alreadySaved: number
  targetDate: Date
  paymentMode: PaymentMode
  upfrontAmount?: number
  emiTenureMonths?: number
  totalMonthlyOverride?: number
}): GoalPlanResult {
  const {
    targetAmount,
    alreadySaved,
    targetDate,
    paymentMode,
    upfrontAmount = Math.round(targetAmount * 0.44),
    emiTenureMonths = 12,
    totalMonthlyOverride,
  } = input

  const monthsUntilPurchase = monthsBetween(new Date(), targetDate)
  const remaining = Math.max(0, targetAmount - alreadySaved)

  if (paymentMode === 'pay_in_full') {
    const monthly =
      totalMonthlyOverride ?? backCalcMonthly(targetAmount, alreadySaved, monthsUntilPurchase)
    return {
      totalMonthly: monthly,
      projectedTargetDate: projectDateFromMonthly(targetAmount, alreadySaved, monthly),
      buckets: [{ role: 'full', monthlyAmount: monthly, subTarget: targetAmount }],
    }
  }

  const upfrontTarget = Math.min(upfrontAmount, targetAmount)
  const financedAmount = Math.max(0, targetAmount - upfrontTarget)
  const tenure = Math.max(1, emiTenureMonths)

  const upfrontMonthly = Math.ceil(
    Math.max(0, upfrontTarget - Math.min(alreadySaved, upfrontTarget)) / monthsUntilPurchase
  )
  const emiReserveMonthly = Math.ceil(financedAmount / tenure)

  let totalMonthly = upfrontMonthly + emiReserveMonthly
  let scaledUpfront = upfrontMonthly
  let scaledEmi = emiReserveMonthly

  if (totalMonthlyOverride != null && totalMonthlyOverride > 0 && totalMonthly > 0) {
    const ratio = totalMonthlyOverride / totalMonthly
    scaledUpfront = Math.ceil(upfrontMonthly * ratio)
    scaledEmi = Math.max(0, Math.ceil(totalMonthlyOverride - scaledUpfront))
    totalMonthly = scaledUpfront + scaledEmi
  } else {
    totalMonthly = scaledUpfront + scaledEmi
  }

  return {
    totalMonthly,
    projectedTargetDate: projectDateFromMonthly(targetAmount, alreadySaved, totalMonthly),
    buckets: [
      { role: 'upfront', monthlyAmount: scaledUpfront, subTarget: upfrontTarget },
      { role: 'emi_reserve', monthlyAmount: scaledEmi, subTarget: financedAmount },
    ],
  }
}

export function bucketDisplayName(goalName: string, role: GoalBucketRole): string {
  if (role === 'full') return goalName
  return `${goalName} — ${GOAL_BUCKET_LABELS[role].title}`
}

export function savingsPaceSliderMax(backCalcMonthly: number, remaining: number): number {
  return Math.max(
    backCalcMonthly,
    Math.min(Math.ceil(backCalcMonthly * 2), remaining > 0 ? remaining : backCalcMonthly * 2)
  )
}
