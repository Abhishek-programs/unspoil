export type BucketType = 'spending' | 'savings' | 'investment'

export interface DefaultBucket {
  name: string
  type: BucketType
  monthlyAmount: number
  color: string
  icon: string
}

export const DEFAULT_BUCKETS: DefaultBucket[] = [
  { name: 'Core Living', type: 'spending', monthlyAmount: 50000, color: '#16A34A', icon: '🏠' },
  { name: 'Dates', type: 'spending', monthlyAmount: 10000, color: '#8B5CF6', icon: '❤️' },
  { name: 'Fun', type: 'spending', monthlyAmount: 5000, color: '#F59E0B', icon: '🎉' },
  { name: 'Emergency Fund', type: 'savings', monthlyAmount: 15000, color: '#3B82F6', icon: '🛡️' },
  { name: 'SIPs', type: 'investment', monthlyAmount: 6000, color: '#10B981', icon: '📈' },
  { name: 'Direct Shares', type: 'investment', monthlyAmount: 15000, color: '#6366F1', icon: '📊' },
  { name: 'BigExpense Equity', type: 'savings', monthlyAmount: 14000, color: '#EC4899', icon: '💎' },
  { name: 'BigExpense Debt', type: 'savings', monthlyAmount: 10000, color: '#14B8A6', icon: '🏦' },
]

export const DEFAULT_INCOME = 125000
export const DEFAULT_EF_FLOOR = 150000
export const DEFAULT_MONTH_START_DAY = 1

export const DEFAULT_KEYWORD_MAPPINGS = [
  { keyword: 'core', bucketName: 'Core Living' },
  { keyword: 'fun', bucketName: 'Fun' },
  { keyword: 'date', bucketName: 'Dates' },
  { keyword: 'ef', bucketName: 'Emergency Fund' },
  { keyword: 'sip', bucketName: 'SIPs' },
]
