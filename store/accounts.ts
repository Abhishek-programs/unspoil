import { create } from 'zustand'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { accounts, accountTransfers, accountAdjustments } from '@/db/schema'
import {
  BANK_ACCOUNT_ID,
  DEFAULT_ACCOUNTS,
  defaultAccountId,
  type AccountKind,
} from '@/constants/accounts'
import {
  creditAccount,
  debitWithBankFallback,
  reconcileAccountsToYourMoney,
  setAccountBalance,
} from '@/lib/accounts'

export interface Account {
  id: string
  name: string
  kind: AccountKind
  balance: number
  sortOrder: number
  isSystem: boolean
}

interface AccountsState {
  accounts: Account[]
  foundMoneyTotal: number
  isLoaded: boolean
  loadAccounts: () => Promise<void>
  ensureAccounts: () => Promise<void>
  /** Seed Bank with yourMoney if all zero and yourMoney > 0 */
  seedFromYourMoney: (yourMoney: number) => Promise<void>
  reconcileToYourMoney: (yourMoney: number) => Promise<void>
  applyIncome: (accountId: string | null | undefined, amount: number) => Promise<void>
  applyExpense: (accountId: string | null | undefined, amount: number) => Promise<void>
  addFoundMoney: (accountId: string, amount: number, note?: string) => Promise<void>
  transfer: (fromId: string, toId: string, amount: number, note?: string) => Promise<void>
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  foundMoneyTotal: 0,
  isLoaded: false,

  loadAccounts: async () => {
    await get().ensureAccounts()
    const rows = await db.select().from(accounts).orderBy(asc(accounts.sortOrder))
    const adjustments = await db.select().from(accountAdjustments)
    const foundMoneyTotal = adjustments.reduce((s, a) => s + a.amount, 0)
    set({
      accounts: rows.map(r => ({
        id: r.id,
        name: r.name,
        kind: r.kind as AccountKind,
        balance: r.balance,
        sortOrder: r.sortOrder,
        isSystem: r.isSystem,
      })),
      foundMoneyTotal,
      isLoaded: true,
    })
  },

  ensureAccounts: async () => {
    const existing = await db.select().from(accounts)
    const ids = new Set(existing.map(a => a.id))
    for (const def of DEFAULT_ACCOUNTS) {
      if (ids.has(def.id)) continue
      await db.insert(accounts).values({
        id: def.id,
        name: def.name,
        kind: def.kind,
        balance: 0,
        sortOrder: def.sortOrder,
        isSystem: true,
      })
    }
  },

  seedFromYourMoney: async (yourMoney) => {
    await get().ensureAccounts()
    const rows = await db.select().from(accounts)
    const sum = rows.reduce((s, r) => s + r.balance, 0)
    if (sum === 0 && yourMoney > 0) {
      await setAccountBalance(BANK_ACCOUNT_ID, yourMoney)
    }
    await get().loadAccounts()
  },

  reconcileToYourMoney: async (yourMoney) => {
    await reconcileAccountsToYourMoney(yourMoney)
    await get().loadAccounts()
  },

  applyIncome: async (accountId, amount) => {
    if (amount <= 0) return
    await creditAccount(accountId || defaultAccountId(), amount)
    await get().loadAccounts()
  },

  applyExpense: async (accountId, amount) => {
    if (amount <= 0) return
    await debitWithBankFallback(accountId, amount)
    await get().loadAccounts()
  },

  addFoundMoney: async (accountId, amount, note) => {
    if (amount === 0) return
    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(accountAdjustments).values({
      id,
      accountId,
      amount,
      note: note?.trim() || null,
      date: now,
      createdAt: now,
    })
    if (amount > 0) await creditAccount(accountId, amount)
    else await debitWithBankFallback(accountId, -amount)
    await get().loadAccounts()
  },

  transfer: async (fromId, toId, amount, note) => {
    if (amount <= 0 || fromId === toId) return
    const rows = await db.select().from(accounts)
    const from = rows.find(r => r.id === fromId)
    if (!from || from.balance < amount) {
      // Allow overdraw from source by pulling remainder from Bank when source isn't Bank
      await debitWithBankFallback(fromId, amount)
    } else {
      await setAccountBalance(fromId, from.balance - amount)
    }
    await creditAccount(toId, amount)
    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(accountTransfers).values({
      id,
      fromAccountId: fromId,
      toAccountId: toId,
      amount,
      note: note?.trim() || null,
      date: now,
      createdAt: now,
    })
    await get().loadAccounts()
  },
}))
