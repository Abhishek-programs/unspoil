import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { buckets, keywordMappings, sureShotMerchants } from '@/db/schema'

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
  keywordMappings: KeywordMapping[]
  sureShotMerchants: SureShotMerchant[]
  isLoaded: boolean
  loadBuckets: () => Promise<void>
  getSpendingBuckets: () => Bucket[]
  getSavingsBuckets: () => Bucket[]
  addBucket: (bucket: Omit<Bucket, 'id'>) => Promise<void>
  updateBucket: (id: string, patch: Partial<Bucket>) => Promise<void>
  deactivateBucket: (id: string) => Promise<void>
  addKeywordMapping: (keyword: string, bucketId: string) => Promise<void>
  deleteKeywordMapping: (id: number) => Promise<void>
  addSureShotMerchant: (merchantName: string, bucketId: string) => Promise<void>
  deleteSureShotMerchant: (id: number) => Promise<void>
}

export const useBucketsStore = create<BucketsState>((set, get) => ({
  buckets: [],
  keywordMappings: [],
  sureShotMerchants: [],
  isLoaded: false,

  loadBuckets: async () => {
    const [bucketRows, keywordRows, merchantRows] = await Promise.all([
      db.select().from(buckets).orderBy(buckets.sortOrder),
      db.select().from(keywordMappings),
      db.select().from(sureShotMerchants),
    ])
    set({
      buckets: bucketRows,
      keywordMappings: keywordRows,
      sureShotMerchants: merchantRows,
      isLoaded: true,
    })
  },

  getSpendingBuckets: () => get().buckets.filter(b => b.type === 'spending' && b.isActive),
  getSavingsBuckets: () => get().buckets.filter(b => (b.type === 'savings' || b.type === 'investment') && b.isActive),

  addBucket: async (bucket) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    await db.insert(buckets).values({ ...bucket, id })
    await get().loadBuckets()
  },

  updateBucket: async (id, patch) => {
    await db.update(buckets).set(patch).where(eq(buckets.id, id))
    await get().loadBuckets()
  },

  deactivateBucket: async (id) => {
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
