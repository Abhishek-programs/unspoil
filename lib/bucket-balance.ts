import { eq } from 'drizzle-orm'
import { db, restoreWipedSpendingCeilings } from '@/db/client'
import { bucketBalances, buckets, playbook } from '@/db/schema'
import { PERSONAL_BUCKET_ID } from '@/constants/defaults'
import { getMonthRange, toLocalDateKey } from '@/lib/month'
import type { Bucket } from '@/store/buckets'

export const PERSONAL_RECOVERY_TOP_UP = 1000

export function effectiveCap(bucket: Bucket): number | null {
  if (bucket.capOverride != null && bucket.capOverride > 0) {
    return bucket.capOverride
  }
  return bucket.accumulationCap ?? null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function currentMonthKey(
  monthStartDay: number,
  earlyMonthStartDate?: string | null,
): string {
  const { start } = getMonthRange(monthStartDay, earlyMonthStartDate)
  const startKey = toLocalDateKey(start)
  return earlyMonthStartDate === startKey
    ? `${startKey.slice(0, 7)}@early-${startKey}`
    : startKey.slice(0, 7)
}

export async function getBucketBalance(bucketId: string): Promise<number> {
  const row = await db
    .select()
    .from(bucketBalances)
    .where(eq(bucketBalances.bucketId, bucketId))
    .limit(1)
  return row[0]?.balance ?? 0
}

export async function setBucketBalance(bucketId: string, balance: number): Promise<void> {
  const now = new Date().toISOString()
  const existing = await db
    .select()
    .from(bucketBalances)
    .where(eq(bucketBalances.bucketId, bucketId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(bucketBalances)
      .set({ balance: Math.max(0, balance), updatedAt: now })
      .where(eq(bucketBalances.bucketId, bucketId))
  } else {
    await db.insert(bucketBalances).values({
      id: generateId(),
      bucketId,
      balance: Math.max(0, balance),
      updatedAt: now,
    })
  }
}

export async function loadAllBucketBalances(): Promise<Record<string, number>> {
  const rows = await db.select().from(bucketBalances)
  const map: Record<string, number> = {}
  for (const row of rows) {
    map[row.bucketId] = row.balance
  }
  return map
}

export async function deductFromAccumulatingBucket(
  bucketId: string,
  amount: number,
): Promise<{ newBalance: number; overspent: number }> {
  const current = await getBucketBalance(bucketId)
  const newBalance = Math.max(0, current - amount)
  const overspent = Math.max(0, amount - current)
  await setBucketBalance(bucketId, newBalance)
  return { newBalance, overspent }
}

export async function restoreToAccumulatingBucket(
  bucketId: string,
  amount: number,
  cap: number | null | undefined,
  bucket?: Bucket,
): Promise<void> {
  const effective = bucket ? effectiveCap(bucket) : cap
  const current = await getBucketBalance(bucketId)
  let next = current + amount
  if (effective != null && effective > 0) {
    next = Math.min(next, effective)
  }
  await setBucketBalance(bucketId, next)
}

export async function applyTopUp(bucket: Bucket): Promise<number> {
  const cap = effectiveCap(bucket)
  const current = await getBucketBalance(bucket.id)
  if (cap != null && current >= cap) {
    return current
  }
  let next = current + bucket.monthlyAmount
  if (cap != null && cap > 0) {
    next = Math.min(next, cap)
  }
  await setBucketBalance(bucket.id, next)
  return next
}

export async function ensureBalanceRow(bucketId: string): Promise<void> {
  const existing = await getBucketBalance(bucketId)
  if (existing === 0) {
    const row = await db
      .select()
      .from(bucketBalances)
      .where(eq(bucketBalances.bucketId, bucketId))
      .limit(1)
    if (row.length === 0) {
      await setBucketBalance(bucketId, 0)
    }
  }
}

export async function runMonthRollover(
  monthStartDay: number,
  lastRolloverMonth: string | null | undefined,
  earlyMonthStartDate?: string | null,
): Promise<string> {
  const monthKey = currentMonthKey(monthStartDay, earlyMonthStartDate)
  if (lastRolloverMonth === monthKey) {
    restoreWipedSpendingCeilings()
    return monthKey
  }

  restoreWipedSpendingCeilings()

  const pbRows = await db.select().from(playbook).limit(1)
  const pb = pbRows[0]
  let recoveryDebt = pb?.personalRecoveryDebt ?? 0
  const normalTopUp = pb?.personalNormalTopUp ?? null

  const allBuckets = await db.select().from(buckets)
  for (const bucket of allBuckets) {
    if (!bucket.accumulates || !bucket.isActive) continue

    if (bucket.id === PERSONAL_BUCKET_ID) {
      await db
        .update(buckets)
        .set({
          capOverride: null,
          capOverrideReason: null,
          capOverridePurchaseAmount: null,
        })
        .where(eq(buckets.id, PERSONAL_BUCKET_ID))
    }

    await ensureBalanceRow(bucket.id)

    const inRecovery =
      bucket.id === PERSONAL_BUCKET_ID && recoveryDebt > 0
    const topUpAmount = inRecovery
      ? PERSONAL_RECOVERY_TOP_UP
      : bucket.monthlyAmount

    await applyTopUp({
      id: bucket.id,
      name: bucket.name,
      type: bucket.type as Bucket['type'],
      monthlyAmount: topUpAmount,
      color: bucket.color,
      icon: bucket.icon,
      sortOrder: bucket.sortOrder,
      isActive: bucket.isActive,
      showOnHome: bucket.showOnHome,
      accumulates: true,
      accumulationCap: bucket.accumulationCap ?? null,
      capOverride: bucket.id === PERSONAL_BUCKET_ID ? null : (bucket.capOverride ?? null),
      capOverrideReason: null,
      capOverridePurchaseAmount: null,
    })

    if (inRecovery && pb) {
      const baseline = normalTopUp != null && normalTopUp > 0 ? normalTopUp : bucket.monthlyAmount
      const recovered = Math.max(0, baseline - PERSONAL_RECOVERY_TOP_UP)
      recoveryDebt = Math.max(0, recoveryDebt - recovered)
      await db
        .update(playbook)
        .set({
          personalRecoveryDebt: recoveryDebt,
          personalNormalTopUp: recoveryDebt > 0 ? baseline : null,
        })
        .where(eq(playbook.id, pb.id))
    }
  }

  restoreWipedSpendingCeilings()
  return monthKey
}

export async function clearPersonalCapOverride(): Promise<void> {
  await db
    .update(buckets)
    .set({
      capOverride: null,
      capOverrideReason: null,
      capOverridePurchaseAmount: null,
    })
    .where(eq(buckets.id, PERSONAL_BUCKET_ID))
}

