import { create } from 'zustand'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'

export interface Transaction {
  id: string
  amount: number
  merchant: string | null
  bucketId: string
  date: string
  source: 'manual' | 'ocr'
  remarks: string | null
  parsedTxnId: string | null
  isFlagged: boolean
  isRecurringDraft: boolean
  createdAt: string
}

interface TransactionsState {
  transactions: Transaction[]
  flaggedTransactions: Transaction[]
  isLoaded: boolean
  loadTransactions: (monthStart: Date, monthEnd: Date) => Promise<void>
  getSpentByBucket: (bucketId: string) => number
  getConfirmedSavingsBuckets: () => Set<string>
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  flaggedTransactions: [],
  isLoaded: false,

  loadTransactions: async (monthStart: Date, monthEnd: Date) => {
    const startStr = monthStart.toISOString()
    const endStr = monthEnd.toISOString()
    const rows = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, startStr),
          lte(transactions.date, endStr),
          eq(transactions.isRecurringDraft, false),
        )
      )
    const flagged = rows.filter(t => t.isFlagged)
    set({ transactions: rows, flaggedTransactions: flagged, isLoaded: true })
  },

  getSpentByBucket: (bucketId: string) => {
    return get()
      .transactions.filter(t => t.bucketId === bucketId && !t.isFlagged && !t.isRecurringDraft)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  // Returns bucket IDs that have at least one confirmed (non-draft, non-flagged) transaction this month
  getConfirmedSavingsBuckets: () => {
    const confirmedIds = new Set<string>()
    get().transactions.forEach(t => {
      if (!t.isFlagged && !t.isRecurringDraft) {
        confirmedIds.add(t.bucketId)
      }
    })
    return confirmedIds
  },
}))
