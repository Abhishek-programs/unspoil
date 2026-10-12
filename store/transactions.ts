import { create } from 'zustand'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'
import { getMonthRange } from '@/lib/month'

export const INCOME_BUCKET_ID = '_income'

export interface Transaction {
  id: string
  type: 'expense' | 'income'
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
  addTransaction: (txn: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  getSpentByBucket: (bucketId: string) => number
  getConfirmedSavingsBuckets: () => Set<string>
  getTotalIncome: () => number
  ensureSalaryTransaction: (monthStartDay: number, salary: number) => Promise<void>
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
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
        )
      )
    const flagged = rows.filter(t => t.isFlagged)
    set({ transactions: rows, flaggedTransactions: flagged, isLoaded: true })
  },

  addTransaction: async (txn) => {
    const id = generateId()
    const now = new Date().toISOString()
    const row = { ...txn, id, createdAt: now }
    await db.insert(transactions).values(row)
    // Reload current month's transactions
    const state = get()
    if (state.transactions.length > 0 || state.isLoaded) {
      // Re-derive month range from the transaction's date context
      const allTxns = [...state.transactions, row]
      const flagged = allTxns.filter(t => t.isFlagged)
      set({ transactions: allTxns, flaggedTransactions: flagged })
    }
  },

  updateTransaction: async (id, patch) => {
    const updateData: Record<string, any> = {}
    if (patch.amount !== undefined) updateData.amount = patch.amount
    if (patch.merchant !== undefined) updateData.merchant = patch.merchant
    if (patch.bucketId !== undefined) updateData.bucketId = patch.bucketId
    if (patch.remarks !== undefined) updateData.remarks = patch.remarks
    if (patch.isFlagged !== undefined) updateData.isFlagged = patch.isFlagged
    if (patch.type !== undefined) updateData.type = patch.type
    if (patch.date !== undefined) updateData.date = patch.date
    if (patch.source !== undefined) updateData.source = patch.source

    await db.update(transactions).set(updateData).where(eq(transactions.id, id))

    const state = get()
    const updated = state.transactions.map(t =>
      t.id === id ? { ...t, ...patch } : t
    )
    const flagged = updated.filter(t => t.isFlagged)
    set({ transactions: updated, flaggedTransactions: flagged })
  },

  deleteTransaction: async (id) => {
    await db.delete(transactions).where(eq(transactions.id, id))

    const state = get()
    const remaining = state.transactions.filter(t => t.id !== id)
    const flagged = remaining.filter(t => t.isFlagged)
    set({ transactions: remaining, flaggedTransactions: flagged })
  },

  getSpentByBucket: (bucketId: string) => {
    return get()
      .transactions.filter(t => t.bucketId === bucketId && !t.isFlagged && !t.isRecurringDraft && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  },

  getConfirmedSavingsBuckets: () => {
    const confirmedIds = new Set<string>()
    get().transactions.forEach(t => {
      if (!t.isFlagged && !t.isRecurringDraft && t.type === 'expense') {
        confirmedIds.add(t.bucketId)
      }
    })
    return confirmedIds
  },

  getTotalIncome: () => {
    return get()
      .transactions.filter(t => t.type === 'income' && !t.isRecurringDraft)
      .reduce((sum, t) => sum + t.amount, 0)
  },

  // Auto-create salary transaction on month_start_day if it doesn't exist yet
  ensureSalaryTransaction: async (monthStartDay: number, salary: number) => {
    if (salary <= 0) return
    const { start, end } = getMonthRange(monthStartDay)
    const startStr = start.toISOString()
    const endStr = end.toISOString()

    const existing = await db
      .select()
      .from(transactions)
      .where(
        and(
          gte(transactions.date, startStr),
          lte(transactions.date, endStr),
          eq(transactions.type, 'income'),
          eq(transactions.remarks, '__salary__'),
        )
      )

    if (existing.length > 0) return // Already created this month

    const salaryDate = new Date(start)
    // If month_start_day hasn't happened yet today, don't create
    if (salaryDate > new Date()) return

    await get().addTransaction({
      type: 'income',
      amount: salary,
      merchant: 'Salary',
      bucketId: INCOME_BUCKET_ID,
      date: salaryDate.toISOString(),
      source: 'manual',
      remarks: '__salary__',
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    })
  },
}))
