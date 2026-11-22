import { CORE_LIVING_BUCKET_ID } from '@/constants/defaults'

/** One toggle for any month without salary: the plan shrinks to the kept buckets and is paid from Free. */
export type NoSalaryPrefs = {
  on: boolean
  since: string | null
  /** Bucket ids that stay funded (spending ceilings, Personal top-up, Future contributions). */
  keep: string[]
  /** Offer a one-tap move from the Emergency Fund when Free can't cover next month. */
  useEf: boolean
  /** Paused-bucket spending already seen in the gentle nudge, per month key. */
  nudgeSeen: { month: string; amount: number } | null
}

export function defaultNoSalary(): NoSalaryPrefs {
  return { on: false, since: null, keep: [CORE_LIVING_BUCKET_ID], useEf: true, nudgeSeen: null }
}

export function parseNoSalary(json: string | null | undefined): NoSalaryPrefs {
  if (!json?.trim()) return defaultNoSalary()
  try {
    const blob = JSON.parse(json) as Partial<NoSalaryPrefs>
    const base = defaultNoSalary()
    return {
      on: blob.on === true,
      since: blob.since ?? null,
      keep: Array.isArray(blob.keep) ? blob.keep.filter(k => typeof k === 'string') : base.keep,
      useEf: blob.useEf !== false,
      nudgeSeen: blob.nudgeSeen ?? null,
    }
  } catch {
    return defaultNoSalary()
  }
}

export function serializeNoSalary(p: NoSalaryPrefs): string {
  return JSON.stringify(p)
}

type BucketLike = {
  id: string
  type: string
  monthlyAmount: number
  isActive: boolean
  accumulates?: boolean
}

/** What one month costs with only the kept buckets funded. */
export function survivalMonthly(
  buckets: BucketLike[],
  keep: string[],
  repayMonthlyTotal = 0,
): number {
  const kept = new Set(keep)
  const funded = buckets
    .filter(b => b.isActive && kept.has(b.id))
    .filter(b => b.type === 'spending' || b.type === 'savings' || b.type === 'investment')
    .reduce((s, b) => s + b.monthlyAmount, 0)
  return funded + repayMonthlyTotal
}

/** Months the cash lasts at a monthly cost; null when there's no cost to divide by. */
export function runwayMonths(cash: number, monthly: number): number | null {
  if (monthly <= 0) return null
  return Math.max(0, cash) / monthly
}

export function formatRunway(months: number | null): string {
  if (months == null) return '—'
  if (months >= 24) return '24+ months'
  if (months < 1) {
    const weeks = Math.floor(months * 4.3)
    return weeks <= 1 ? 'under 2 weeks' : `~${weeks} weeks`
  }
  const rounded = Math.floor(months * 10) / 10
  return `~${rounded} month${rounded === 1 ? '' : 's'}`
}

/**
 * Safe to spend = the month's plan, but never more than cash that isn't set aside.
 * Lending, repayments and carry live in Free, so they only bite once Free is empty.
 */
export function computeSafeToSpend(args: {
  funded: boolean
  planRemaining: number
  yourMoney: number
  setAside: number
}): { safe: number; cashAvailable: number; free: number } {
  const cashAvailable = Math.max(0, args.yourMoney - args.setAside)
  if (!args.funded) return { safe: 0, cashAvailable, free: cashAvailable }
  const safe = Math.min(args.planRemaining, cashAvailable)
  const free = Math.max(0, cashAvailable - Math.max(0, args.planRemaining))
  return { safe, cashAvailable, free }
}
