export const SALARY_BUCKET_ID = '_salary'
/** Expense bucket for a goal purchase that hits no Living ceiling. */
export const GOAL_PURCHASE_BUCKET_ID = '_goal_purchase'
/** Expense the user chose to keep outside every bucket (the "My money" tile). */
export const MY_MONEY_BUCKET_ID = '_my_money'
/** Income row: leftover released to Your money when a goal is completed or closed. */
export const GOAL_RETURN_BUCKET_ID = '_goal_return'
/** Pseudo wallet: the money came out of a goal's savings, not Your money. */
export const GOAL_SAVINGS_ACCOUNT_ID = '_goal_savings'

export function isPaidFromSavings(t: { accountId?: string | null }): boolean {
  return t.accountId === GOAL_SAVINGS_ACCOUNT_ID
}

/**
 * Amount taken back out of these savings buckets: purchases and moves paid from
 * goal savings, plus leftover released to Your money (income rows).
 */
export function withdrawnFromBuckets(
  bucketIds: string[],
  txns: { amount: number; fundedFromBucketId?: string | null }[],
): number {
  return txns.reduce(
    (sum, t) =>
      t.fundedFromBucketId && bucketIds.includes(t.fundedFromBucketId) ? sum + t.amount : sum,
    0,
  )
}

export function isSalaryTxn(t: { type: string; bucketId: string }): boolean {
  return t.type === 'income' && t.bucketId === SALARY_BUCKET_ID
}

export function isFutureBucketType(type: string | null | undefined): boolean {
  return type === 'savings' || type === 'investment'
}

export function isSavingsConfirmTxn(
  t: { type: string; bucketId: string; accountId?: string | null },
  buckets: { id: string; type: string }[],
): boolean {
  if (t.type !== 'expense') return false
  // Savings moved between goals is not this month's contribution from Your money.
  if (isPaidFromSavings(t)) return false
  return isFutureBucketType(buckets.find(b => b.id === t.bucketId)?.type)
}
