import { isFutureBucketType } from '@/lib/txn-kind'

export function spentTowardBucket(
  bucket: { id: string; accumulates?: boolean },
  txns: {
    type: string
    amount: number
    bucketId: string
    fundedFromBucketId?: string | null
    isFlagged: boolean
    isRecurringDraft: boolean
  }[],
  allBuckets: { id: string; type: string }[],
): number {
  const futureIds = new Set(
    allBuckets.filter(b => isFutureBucketType(b.type)).map(b => b.id),
  )
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
    else if (t.fundedFromBucketId === bucket.id && destIsFuture) {
      spent += t.amount
    }
  }
  return Math.max(0, spent - putBack)
}
