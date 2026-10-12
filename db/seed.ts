import { db } from './client'
import { buckets, keywordMappings, playbook } from './schema'
import { DEFAULT_BUCKETS, DEFAULT_INCOME, DEFAULT_EF_FLOOR, DEFAULT_KEYWORD_MAPPINGS, EF_BUCKET_ID } from '@/constants/defaults'

// Called once after first migration. Seeds default playbook and buckets.
export async function seedDefaults() {
  const existing = await db.select().from(playbook).limit(1)
  if (existing.length > 0) return // Already seeded

  // Insert default buckets — Emergency Fund gets a stable ID
  const bucketInserts = DEFAULT_BUCKETS.map((b, i) => ({
    id: b.name === 'Emergency Fund' ? EF_BUCKET_ID : `bucket_${i + 1}`,
    name: b.name,
    type: b.type,
    monthlyAmount: b.monthlyAmount,
    color: b.color,
    icon: b.icon,
    sortOrder: i,
    isActive: true,
    showOnHome: true,
  }))
  await db.insert(buckets).values(bucketInserts).onConflictDoNothing()

  // Insert default playbook row
  const fallbackBucket = bucketInserts.find(b => b.name === 'Core Living')
  await db.insert(playbook).values({
    id: 1,
    monthlyIncome: DEFAULT_INCOME,
    monthStartDay: 1,
    fallbackBucketId: fallbackBucket?.id ?? null,
    efFloor: DEFAULT_EF_FLOOR,
    isOnboarded: false,
  }).onConflictDoNothing()

  // Insert default keyword mappings
  const keywordInserts = DEFAULT_KEYWORD_MAPPINGS.map(km => {
    const bucket = bucketInserts.find(b => b.name === km.bucketName)
    return bucket ? { keyword: km.keyword, bucketId: bucket.id } : null
  }).filter(Boolean) as { keyword: string; bucketId: string }[]

  if (keywordInserts.length > 0) {
    await db.insert(keywordMappings).values(keywordInserts).onConflictDoNothing()
  }
}
