import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db, sqlite } from '@/db/client'
import { buckets, keywordMappings, sureShotMerchants } from '@/db/schema'
import { EF_BUCKET_ID, GOAL_BUCKET_COLOR, GOAL_BUCKET_ICON, GOAL_POOL_BUCKET_ID, isNonRemovableBucket } from '@/constants/defaults'
import { ensureBalanceRow, loadAllBucketBalances } from '@/lib/bucket-balance'

export interface Bucket {
  id: string
  name: string
  type: 'spending' | 'savings' | 'investment'
  monthlyAmount: number
  color: string
  icon: string
  sortOrder: number
  isActive: boolean
  showOnHome: boolean
  linkedGoalId?: string | null
  goalBucketRole?: 'full' | 'upfront' | 'emi_reserve' | null
  accumulates?: boolean
  accumulationCap?: number | null
  capOverride?: number | null
  capOverrideReason?: 'general' | 'purchase' | null
  capOverridePurchaseAmount?: number | null
}

export interface KeywordMapping {
  id: number
  keyword: string
  bucketId: string
}

export interface SureShotMerchant {
  id: number
  merchantName: string
  bucketId: string
}

interface BucketsState {
  buckets: Bucket[]
  bucketBalances: Record<string, number>
  keywordMappings: KeywordMapping[]
  sureShotMerchants: SureShotMerchant[]
  isLoaded: boolean
  loadBuckets: () => Promise<void>
  getSpendingBuckets: () => Bucket[]
  getSavingsBuckets: () => Bucket[]
  getBucketBalance: (id: string) => number
  refreshBalances: () => Promise<void>
  addBucket: (bucket: Omit<Bucket, 'id'>) => Promise<void>
  ensureGoalPoolBucket: () => Promise<void>
  updateBucket: (id: string, patch: Partial<Bucket>) => Promise<void>
  deactivateBucket: (id: string) => Promise<void>
  addKeywordMapping: (keyword: string, bucketId: string) => Promise<void>
  deleteKeywordMapping: (id: number) => Promise<void>
  addSureShotMerchant: (merchantName: string, bucketId: string) => Promise<void>
  deleteSureShotMerchant: (id: number) => Promise<void>
}

export const useBucketsStore = create<BucketsState>((set, get) => ({
  buckets: [],
  bucketBalances: {},
  keywordMappings: [],
  sureShotMerchants: [],
  isLoaded: false,

  loadBuckets: async () => {
    const [bucketRows, keywordRows, merchantRows, balances] = await Promise.all([
      db.select().from(buckets).orderBy(buckets.sortOrder),
      db.select().from(keywordMappings),
      db.select().from(sureShotMerchants),
      loadAllBucketBalances(),
    ])

    // Always read raw monthly_amount so a bad Drizzle mapping can't show Living ceilings as 0.
    const rawRows = sqlite.getAllSync(
      `SELECT id, monthly_amount FROM buckets`,
    ) as Array<{ id: string; monthly_amount: number | null } | Record<string, unknown>>
    const rawAmounts: Record<string, number> = {}
    for (const row of rawRows) {
      const id = String((row as { id?: unknown }).id ?? (row as { 0?: unknown })[0] ?? '')
      const amount =
        (row as { monthly_amount?: unknown }).monthly_amount ??
        (row as { 1?: unknown })[1]
      if (id) rawAmounts[id] = Number(amount) || 0
    }

    set({
      buckets: bucketRows.map(b => {
        const fromDrizzle = Number(b.monthlyAmount)
        const fromRaw = rawAmounts[b.id]
        const monthlyAmount =
          Number.isFinite(fromDrizzle) && fromDrizzle > 0
            ? fromDrizzle
            : fromRaw != null && fromRaw > 0
              ? fromRaw
              : Number.isFinite(fromDrizzle)
                ? fromDrizzle
                : fromRaw ?? 0
        return {
          ...b,
          monthlyAmount,
          linkedGoalId: b.linkedGoalId ?? null,
          goalBucketRole: b.goalBucketRole ?? null,
          accumulates: b.accumulates ?? false,
          accumulationCap: b.accumulationCap ?? null,
          capOverride: b.capOverride ?? null,
          capOverrideReason: (b.capOverrideReason as Bucket['capOverrideReason']) ?? null,
          capOverridePurchaseAmount: b.capOverridePurchaseAmount ?? null,
        }
      }),
      bucketBalances: balances,
      keywordMappings: keywordRows,
      sureShotMerchants: merchantRows,
      isLoaded: true,
    })
  },

  getSpendingBuckets: () => get().buckets.filter(b => b.type === 'spending' && b.isActive),
  getSavingsBuckets: () => get().buckets.filter(b => (b.type === 'savings' || b.type === 'investment') && b.isActive),

  getBucketBalance: (id: string) => get().bucketBalances[id] ?? 0,

  refreshBalances: async () => {
    const balances = await loadAllBucketBalances()
    set({ bucketBalances: balances })
  },

  addBucket: async (bucket) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    await db.insert(buckets).values({
      ...bucket,
      id,
      lastMonthlyAmount: bucket.monthlyAmount > 0 ? bucket.monthlyAmount : null,
      linkedGoalId: bucket.linkedGoalId ?? null,
      goalBucketRole: bucket.goalBucketRole ?? null,
      accumulates: bucket.accumulates ?? false,
      accumulationCap: bucket.accumulationCap ?? null,
      capOverride: bucket.capOverride ?? null,
      capOverrideReason: bucket.capOverrideReason ?? null,
      capOverridePurchaseAmount: bucket.capOverridePurchaseAmount ?? null,
    })
    if (bucket.accumulates) {
      await ensureBalanceRow(id)
    }
    await get().loadBuckets()
  },

  ensureGoalPoolBucket: async () => {
    if (get().buckets.some(b => b.id === GOAL_POOL_BUCKET_ID)) return
    await db.insert(buckets).values({
      id: GOAL_POOL_BUCKET_ID,
      name: 'Saving towards goal',
      type: 'savings',
      monthlyAmount: 0,
      color: GOAL_BUCKET_COLOR,
      icon: GOAL_BUCKET_ICON,
      sortOrder: 5,
      isActive: true,
      showOnHome: true,
      linkedGoalId: null,
      goalBucketRole: null,
      accumulates: false,
      accumulationCap: null,
      capOverride: null,
      capOverrideReason: null,
      capOverridePurchaseAmount: null,
    }).onConflictDoNothing()
    await get().loadBuckets()
  },

  updateBucket: async (id, patch) => {
    const current = get().buckets.find(b => b.id === id)
    const nextAmount = patch.monthlyAmount
    // A 0 from a stale read must never overwrite a live ceiling.
    if (nextAmount === 0 && (current?.monthlyAmount ?? 0) > 0) {
      const { monthlyAmount: _ignored, ...safe } = patch
      patch = safe
    }
    const write =
      patch.monthlyAmount != null && patch.monthlyAmount > 0
        ? { ...patch, lastMonthlyAmount: patch.monthlyAmount }
        : patch
    await db.update(buckets).set(write).where(eq(buckets.id, id))
    if (patch.accumulates) {
      await ensureBalanceRow(id)
    }
    await get().loadBuckets()
  },

  deactivateBucket: async (id) => {
    const bucket = get().buckets.find(b => b.id === id)
    if (bucket && isNonRemovableBucket(bucket)) return
    if (id === EF_BUCKET_ID) return
    await db.update(buckets).set({ isActive: false }).where(eq(buckets.id, id))
    await get().loadBuckets()
  },

  addKeywordMapping: async (keyword, bucketId) => {
    await db.insert(keywordMappings).values({ keyword, bucketId })
    await get().loadBuckets()
  },

  deleteKeywordMapping: async (id) => {
    await db.delete(keywordMappings).where(eq(keywordMappings.id, id))
    await get().loadBuckets()
  },

  addSureShotMerchant: async (merchantName, bucketId) => {
    await db.insert(sureShotMerchants).values({ merchantName, bucketId })
    await get().loadBuckets()
  },

  deleteSureShotMerchant: async (id) => {
    await db.delete(sureShotMerchants).where(eq(sureShotMerchants.id, id))
    await get().loadBuckets()
  },
}))

