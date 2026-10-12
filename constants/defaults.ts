export type BucketType = 'spending' | 'savings' | 'investment'

export interface DefaultBucket {
  id: string
  name: string
  type: BucketType
  monthlyAmount: number
  color: string
  icon: string
  accumulates?: boolean
  accumulationCap?: number
}

export const CORE_LIVING_BUCKET_ID = 'core-living'
export const EF_BUCKET_ID = 'ef'
export const DATES_BUCKET_ID = 'dates'
export const FUN_BUCKET_ID = 'fun'
/** @deprecated Removed bucket — kept for legacy DB rows only */
export const FOOD_BUCKET_ID = 'food'
export const PERSONAL_BUCKET_ID = 'personal'
export const SIP_BUCKET_ID = 'sip'
export const SHARES_BUCKET_ID = 'shares'
export const GOAL_POOL_BUCKET_ID = 'goal-pool'
/** @deprecated Legacy IDs — migrated in m0005; not seeded for new installs */
export const BIGEXPENSE_EQUITY_BUCKET_ID = 'bigexpense-equity'
export const BIGEXPENSE_DEBT_BUCKET_ID = 'bigexpense-debt'

export const GOAL_BUCKET_COLOR = '#EC4899'
export const GOAL_BUCKET_ICON = '🎯'

export const NON_REMOVABLE_BUCKET_IDS = [CORE_LIVING_BUCKET_ID, EF_BUCKET_ID]

export function isNonRemovableBucket(bucket: { id: string; name: string }): boolean {
  return (
    NON_REMOVABLE_BUCKET_IDS.includes(bucket.id) ||
    bucket.name === 'Core Living' ||
    bucket.name === 'Emergency Fund'
  )
}

export const DEFAULT_BUCKETS: DefaultBucket[] = [
  { id: CORE_LIVING_BUCKET_ID, name: 'Core Living', type: 'spending', monthlyAmount: 50000, color: '#16A34A', icon: '🏠' },
  { id: DATES_BUCKET_ID, name: 'Dates', type: 'spending', monthlyAmount: 10000, color: '#8B5CF6', icon: '❤️' },
  { id: FUN_BUCKET_ID, name: 'Fun', type: 'spending', monthlyAmount: 5000, color: '#F59E0B', icon: '🎉' },
  {
    id: PERSONAL_BUCKET_ID,
    name: 'Personal',
    type: 'spending',
    monthlyAmount: 5000,
    color: '#7C3AED',
    icon: '👤',
    accumulates: true,
    accumulationCap: 20000,
  },
  { id: EF_BUCKET_ID, name: 'Emergency Fund', type: 'savings', monthlyAmount: 15000, color: '#3B82F6', icon: '🛡️' },
  {
    id: GOAL_POOL_BUCKET_ID,
    name: 'Saving towards goal',
    type: 'savings',
    monthlyAmount: 0,
    color: GOAL_BUCKET_COLOR,
    icon: GOAL_BUCKET_ICON,
  },
  { id: SIP_BUCKET_ID, name: 'SIPs', type: 'investment', monthlyAmount: 6000, color: '#10B981', icon: '📈' },
  { id: SHARES_BUCKET_ID, name: 'Direct Shares', type: 'investment', monthlyAmount: 15000, color: '#6366F1', icon: '📊' },
]

export const EF_MULTIPLIER = 6 // EF target = multiplier × Core Living monthly amount

export const DEFAULT_INCOME = 125000
export const DEFAULT_EF_FLOOR = EF_MULTIPLIER * 50000
export const DEFAULT_MONTH_START_DAY = 1

export const DEFAULT_KEYWORD_MAPPINGS = [
  { keyword: 'core', bucketName: 'Core Living' },
  { keyword: 'fun', bucketName: 'Fun' },
  { keyword: 'date', bucketName: 'Dates' },
  { keyword: 'personal', bucketName: 'Personal' },
  { keyword: 'ef', bucketName: 'Emergency Fund' },
  { keyword: 'sip', bucketName: 'SIPs' },
]

export const DEFAULT_MACBOOK_GOAL = {
  name: 'MacBook',
  targetAmount: 340000,
  monthsFromNow: 18,
}
