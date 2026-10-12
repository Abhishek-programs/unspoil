import { db } from './client'
import { buckets, keywordMappings, playbook } from './schema'
import {
  DEFAULT_BUCKETS,
  DEFAULT_INCOME,
  DEFAULT_EF_FLOOR,
  DEFAULT_KEYWORD_MAPPINGS,
  PERSONAL_BUCKET_ID,
  MISC_BUCKET_ID,
} from '@/constants/defaults'
import { ensureBalanceRow } from '@/lib/bucket-balance'

export async function seedDefaults() {
  const existing = await db.select().from(playbook).limit(1)
  if (existing.length > 0) {
    // Playbook exists, but a failed migration reset can leave buckets missing.
    const existingBuckets = await db.select({ id: buckets.id }).from(buckets)
    const have = new Set(existingBuckets.map(b => b.id))
    const missing = DEFAULT_BUCKETS.filter(b => !have.has(b.id)).map((b, i) => ({
      id: b.id,
      name: b.name,
      type: b.type,
      monthlyAmount: b.monthlyAmount,
      color: b.color,
      icon: b.icon,
      sortOrder: existingBuckets.length + i,
      isActive: true,
      showOnHome: true,
      accumulates: b.accumulates ?? false,
      accumulationCap: b.accumulationCap ?? null,
    }))
    if (missing.length > 0) {
      await db.insert(buckets).values(missing).onConflictDoNothing()
      if (missing.some(b => b.id === PERSONAL_BUCKET_ID && b.accumulates)) {
        await ensureBalanceRow(PERSONAL_BUCKET_ID)
      }
    }
    return
  }

  const bucketInserts = DEFAULT_BUCKETS.map((b, i) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    monthlyAmount: b.monthlyAmount,
    color: b.color,
    icon: b.icon,
    sortOrder: i,
    isActive: true,
    showOnHome: true,
    accumulates: b.accumulates ?? false,
    accumulationCap: b.accumulationCap ?? null,
  }))
  await db.insert(buckets).values(bucketInserts).onConflictDoNothing()

  if (bucketInserts.some(b => b.id === PERSONAL_BUCKET_ID && b.accumulates)) {
    await ensureBalanceRow(PERSONAL_BUCKET_ID)
  }

  const fallbackBucket = bucketInserts.find(b => b.id === MISC_BUCKET_ID)
  await db.insert(playbook).values({
    id: 1,
    monthlyIncome: DEFAULT_INCOME,
    monthStartDay: 1,
    fallbackBucketId: fallbackBucket?.id ?? null,
    efFloor: DEFAULT_EF_FLOOR,
    efStartBalance: 0,
    isOnboarded: false,
  }).onConflictDoNothing()

  const keywordInserts = DEFAULT_KEYWORD_MAPPINGS.map(km => {
    const bucket = bucketInserts.find(b => b.name === km.bucketName)
    return bucket ? { keyword: km.keyword, bucketId: bucket.id } : null
  }).filter(Boolean) as { keyword: string; bucketId: string }[]

  if (keywordInserts.length > 0) {
    await db.insert(keywordMappings).values(keywordInserts).onConflictDoNothing()
  }
}
