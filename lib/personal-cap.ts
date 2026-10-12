import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { buckets } from '@/db/schema'
import { PERSONAL_BUCKET_ID } from '@/constants/defaults'
import { effectiveCap, getBucketBalance } from '@/lib/bucket-balance'
import type { Bucket } from '@/store/buckets'

export async function isPersonalAtCap(bucket: Bucket): Promise<boolean> {
  if (!bucket.accumulates || bucket.id !== PERSONAL_BUCKET_ID) return false
  const cap = effectiveCap(bucket)
  if (cap == null || cap <= 0) return false
  const balance = await getBucketBalance(bucket.id)
  return balance >= cap
}

export async function raisePersonalCap(
  newCap: number,
  reason: 'general' | 'purchase',
  purchaseAmount?: number,
): Promise<void> {
  await db
    .update(buckets)
    .set({
      capOverride: newCap,
      capOverrideReason: reason,
      capOverridePurchaseAmount: reason === 'purchase' ? (purchaseAmount ?? null) : null,
    })
    .where(eq(buckets.id, PERSONAL_BUCKET_ID))
}

export async function clearPersonalCapOverrideIfNeeded(
  amount: number,
  bucket: Bucket,
): Promise<void> {
  if (bucket.id !== PERSONAL_BUCKET_ID || !bucket.capOverride) return

  if (bucket.capOverrideReason === 'purchase' && bucket.capOverridePurchaseAmount) {
    if (amount >= bucket.capOverridePurchaseAmount) {
      await db
        .update(buckets)
        .set({
          capOverride: null,
          capOverrideReason: null,
          capOverridePurchaseAmount: null,
        })
        .where(eq(buckets.id, PERSONAL_BUCKET_ID))
    }
  } else {
    await db
      .update(buckets)
      .set({
        capOverride: null,
        capOverrideReason: null,
        capOverridePurchaseAmount: null,
      })
      .where(eq(buckets.id, PERSONAL_BUCKET_ID))
  }
}
