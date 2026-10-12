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
}))
