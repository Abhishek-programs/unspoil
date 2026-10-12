export const SALARY_BUCKET_ID = '_salary'

export function isSalaryTxn(t: { type: string; bucketId: string }): boolean {
  return t.type === 'income' && t.bucketId === SALARY_BUCKET_ID
}

export function isFutureBucketType(type: string | null | undefined): boolean {
  return type === 'savings' || type === 'investment'
}

export function isSavingsConfirmTxn(
  t: { type: string; bucketId: string },
  buckets: { id: string; type: string }[],
): boolean {
  if (t.type !== 'expense') return false
  return isFutureBucketType(buckets.find(b => b.id === t.bucketId)?.type)
}
