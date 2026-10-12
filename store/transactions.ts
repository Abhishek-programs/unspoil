import { create } from 'zustand'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { transactions } from '@/db/schema'
import { getMonthRange } from '@/lib/month'
import {
  deductFromAccumulatingBucket,
  isAccumulatingExpense,
  restoreToAccumulatingBucket,
} from '@/lib/bucket-balance'
import { clearPersonalCapOverrideIfNeeded } from '@/lib/personal-cap'
import { useBucketsStore } from '@/store/buckets'
import { useAccountsStore } from '@/store/accounts'
import { defaultAccountId } from '@/constants/accounts'

export const INCOME_BUCKET_ID = '_income'

export interface Transaction {
  id: string
  type: 'expense' | 'income'
  amount: number
  merchant: string | null
  description: string | null
  bucketId: string
  date: string
  source: 'manual' | 'ocr' | 'overlay' | 'notification'
  remarks: string | null
  fundedFromBucketId: string | null
  accountId: string | null
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
  addTransaction: (
    txn: Omit<Transaction, 'id' | 'createdAt' | 'accountId'> & { accountId?: string | null },
  ) => Promise<{ overspent?: number }>
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

function isFundedFromSavingsConfirm(txn: {
  type: string
  remarks: string | null
  fundedFromBucketId?: string | null
}): boolean {
  return (
    txn.type === 'expense' &&
    txn.remarks === '__savings_confirm__' &&
    !!txn.fundedFromBucketId
  )
}

async function applyFundedFromDebit(
  fundedFromBucketId: string | null | undefined,
  amount: number,
): Promise<number | undefined> {
  if (!fundedFromBucketId) return undefined
  const fundedBucket = useBucketsStore.getState().buckets.find(b => b.id === fundedFromBucketId)
  if (!fundedBucket?.accumulates) return undefined

  const result = await deductFromAccumulatingBucket(fundedBucket.id, amount)
  await clearPersonalCapOverrideIfNeeded(amount, fundedBucket)
  await useBucketsStore.getState().loadBuckets()
  return result.overspent > 0 ? result.overspent : undefined
}

async function restoreFundedFromDebit(
  fundedFromBucketId: string | null | undefined,
  amount: number,
): Promise<void> {
  if (!fundedFromBucketId) return
  const fundedBucket = useBucketsStore.getState().buckets.find(b => b.id === fundedFromBucketId)
  if (!fundedBucket?.accumulates) return

  await restoreToAccumulatingBucket(
    fundedBucket.id,
    amount,
    fundedBucket.accumulationCap,
    fundedBucket,
  )
  await useBucketsStore.getState().refreshBalances()
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
    const row = {
      ...txn,
      fundedFromBucketId: txn.fundedFromBucketId ?? null,
      accountId: txn.accountId ?? defaultAccountId(),
      id,
      createdAt: now,
    }
    await db.insert(transactions).values(row)

    if (!txn.isRecurringDraft) {
      const accounts = useAccountsStore.getState()
      if (txn.type === 'income') {
        if (txn.remarks === '__salary__') {
          await accounts.applyIncome(row.accountId, txn.amount)
        } else {
          // Non-salary income increases Your money (found/extra) into the chosen account
          await accounts.addFoundMoney(row.accountId || defaultAccountId(), txn.amount, 'Income')
        }
      } else if (txn.type === 'expense' && !txn.isFlagged) {
        await accounts.applyExpense(row.accountId, txn.amount)
      }
    }

    let overspent: number | undefined
    const bucket = useBucketsStore.getState().buckets.find(b => b.id === txn.bucketId)
    if (
      bucket?.accumulates &&
      txn.type === 'expense' &&
      isAccumulatingExpense(txn.remarks)
    ) {
      const result = await deductFromAccumulatingBucket(bucket.id, txn.amount)
      await clearPersonalCapOverrideIfNeeded(txn.amount, bucket)
      await useBucketsStore.getState().loadBuckets()
      if (result.overspent > 0) {
        overspent = result.overspent
      }
    }

    if (isFundedFromSavingsConfirm(row)) {
      const fundedOverspent = await applyFundedFromDebit(row.fundedFromBucketId, row.amount)
      if (fundedOverspent != null) {
        overspent = fundedOverspent
      }
    }

    const state = get()
    const allTxns = [...state.transactions, row]
    const flagged = allTxns.filter(t => t.isFlagged)
    set({ transactions: allTxns, flaggedTransactions: flagged, isLoaded: true })

    return { overspent }
  },

  updateTransaction: async (id, patch) => {
    const existing = get().transactions.find(t => t.id === id)
    if (!existing) return

    const next = { ...existing, ...patch }
    const updateData: Record<string, any> = {}
    if (patch.amount !== undefined) updateData.amount = patch.amount
    if (patch.merchant !== undefined) updateData.merchant = patch.merchant
    if (patch.description !== undefined) updateData.description = patch.description
    if (patch.bucketId !== undefined) updateData.bucketId = patch.bucketId
    if (patch.remarks !== undefined) updateData.remarks = patch.remarks
    if (patch.fundedFromBucketId !== undefined) {
      updateData.fundedFromBucketId = patch.fundedFromBucketId
    }
    if (patch.accountId !== undefined) updateData.accountId = patch.accountId
    if (patch.isFlagged !== undefined) updateData.isFlagged = patch.isFlagged
    if (patch.type !== undefined) updateData.type = patch.type
    if (patch.date !== undefined) updateData.date = patch.date
    if (patch.source !== undefined) updateData.source = patch.source

    // Reverse old Personal funded-from debit, apply new if needed
    if (isFundedFromSavingsConfirm(existing)) {
      await restoreFundedFromDebit(existing.fundedFromBucketId, existing.amount)
    }

    await db.update(transactions).set(updateData).where(eq(transactions.id, id))

    if (isFundedFromSavingsConfirm(next)) {
      await applyFundedFromDebit(next.fundedFromBucketId, next.amount)
    }

    const accounts = useAccountsStore.getState()
    const wasFlaggedExpense = existing.type === 'expense' && existing.isFlagged && !existing.isRecurringDraft
    const nowUnflagged = next.type === 'expense' && !next.isFlagged && !next.isRecurringDraft

    // First-time categorize of a flagged payment: debit account
    if (wasFlaggedExpense && nowUnflagged && existing.isFlagged && patch.isFlagged === false) {
      await accounts.applyExpense(next.accountId ?? defaultAccountId(), next.amount)
    } else if (
      !existing.isRecurringDraft &&
      !existing.isFlagged &&
      (patch.amount !== undefined || patch.accountId !== undefined || patch.type !== undefined)
    ) {
      if (existing.type === 'income') {
        await accounts.applyExpense(existing.accountId, existing.amount)
      } else if (existing.type === 'expense') {
        await accounts.applyIncome(existing.accountId, existing.amount)
      }
      if (next.type === 'income') {
        await accounts.applyIncome(next.accountId ?? defaultAccountId(), next.amount)
      } else if (next.type === 'expense' && !next.isFlagged) {
        await accounts.applyExpense(next.accountId ?? defaultAccountId(), next.amount)
      }
    }

    const state = get()
    const updated = state.transactions.map(t =>
      t.id === id ? { ...t, ...patch } : t
    )
    const flagged = updated.filter(t => t.isFlagged)
    set({ transactions: updated, flaggedTransactions: flagged })
  },

  deleteTransaction: async (id) => {
    const txn = get().transactions.find(t => t.id === id)
    await db.delete(transactions).where(eq(transactions.id, id))

    if (txn) {
      if (!txn.isRecurringDraft && !(txn.type === 'expense' && txn.isFlagged)) {
        const accounts = useAccountsStore.getState()
        if (txn.type === 'income') {
          if (txn.remarks === '__salary__') {
            await accounts.applyExpense(txn.accountId, txn.amount)
          } else {
            await accounts.addFoundMoney(txn.accountId || defaultAccountId(), -txn.amount, 'Income reversed')
          }
        } else if (txn.type === 'expense') {
          await accounts.applyIncome(txn.accountId, txn.amount)
        }
      }

      const bucket = useBucketsStore.getState().buckets.find(b => b.id === txn.bucketId)
      if (
        bucket?.accumulates &&
        txn.type === 'expense' &&
        isAccumulatingExpense(txn.remarks)
      ) {
        await restoreToAccumulatingBucket(
          bucket.id,
          txn.amount,
          bucket.accumulationCap,
          bucket,
        )
        await useBucketsStore.getState().refreshBalances()
      }

      if (isFundedFromSavingsConfirm(txn)) {
        await restoreFundedFromDebit(txn.fundedFromBucketId, txn.amount)
      }
    }

    const state = get()
    const remaining = state.transactions.filter(t => t.id !== id)
    const flagged = remaining.filter(t => t.isFlagged)
    set({ transactions: remaining, flaggedTransactions: flagged })
  },

  getSpentByBucket: (bucketId: string) => {
    const bucket = useBucketsStore.getState().buckets.find(b => b.id === bucketId)
    return get()
      .transactions.filter(t => {
        if (t.isFlagged || t.isRecurringDraft || t.type !== 'expense') return false
        if (bucket?.accumulates) {
          return (
            (t.bucketId === bucketId && (!t.remarks || !t.remarks.startsWith('__'))) ||
            (t.fundedFromBucketId === bucketId && t.remarks === '__savings_confirm__')
          )
        }
        if (t.bucketId === bucketId) return true
        return t.fundedFromBucketId === bucketId && t.remarks === '__savings_confirm__'
      })
      .reduce((sum, t) => sum + t.amount, 0)
  },

  getConfirmedSavingsBuckets: () => {
    const confirmedIds = new Set<string>()
    get().transactions.forEach(t => {
      if (
        !t.isFlagged &&
        !t.isRecurringDraft &&
        t.type === 'expense' &&
        t.remarks === '__savings_confirm__'
      ) {
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

    if (existing.length > 0) return

    const salaryDate = new Date(start)
    if (salaryDate > new Date()) return

    await get().addTransaction({
      type: 'income',
      amount: salary,
      description: 'Salary received',
      merchant: 'Salary',
      bucketId: INCOME_BUCKET_ID,
      date: salaryDate.toISOString(),
      source: 'manual',
      remarks: '__salary__',
      fundedFromBucketId: null,
      accountId: defaultAccountId(),
      parsedTxnId: null,
      isFlagged: false,
      isRecurringDraft: false,
    })
  },
}))
