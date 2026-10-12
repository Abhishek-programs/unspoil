import { create } from 'zustand'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { contacts, lendBorrowEntries } from '@/db/schema'
import {
  type Contact,
  type LendBorrowEntry,
  type LendBorrowType,
  computePersonBalance,
  computeTotalNetBalance,
  computeLentOutAsset,
  computeYouOweLiability,
} from '@/lib/lending/balance'

export type { Contact, LendBorrowEntry, LendBorrowType }

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

let cachedMonthRange: { start: Date; end: Date } | null = null

interface LendingState {
  contacts: Contact[]
  entries: LendBorrowEntry[]
  allEntries: LendBorrowEntry[]
  isLoaded: boolean
  loadContacts: () => Promise<void>
  loadEntries: (monthStart: Date, monthEnd: Date) => Promise<void>
  loadAllEntries: () => Promise<void>
  addContact: (name: string) => Promise<Contact>
  addEntry: (data: {
    contactId: string
    type: LendBorrowType
    amount: number
    note?: string | null
    date: string
  }) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  deleteContact: (id: string) => Promise<{ ok: boolean; error?: string }>
  getPersonBalance: (contactId: string) => number
  getTotalNetBalance: () => number
  getLentOutTotal: () => number
  getYouOweTotal: () => number
  findContactByName: (name: string) => Contact | undefined
}

export const useLendingStore = create<LendingState>((set, get) => ({
  contacts: [],
  entries: [],
  allEntries: [],
  isLoaded: false,

  loadContacts: async () => {
    const rows = await db.select().from(contacts).orderBy(asc(contacts.name))
    set({
      contacts: rows.map(r => ({
        id: r.id,
        name: r.name,
        createdAt: r.createdAt,
      })),
    })
  },

  loadEntries: async (monthStart: Date, monthEnd: Date) => {
    cachedMonthRange = { start: monthStart, end: monthEnd }
    const startStr = monthStart.toISOString()
    const endStr = monthEnd.toISOString()
    const rows = await db
      .select()
      .from(lendBorrowEntries)
      .where(and(gte(lendBorrowEntries.date, startStr), lte(lendBorrowEntries.date, endStr)))
    set({
      entries: rows.map(mapEntry),
      isLoaded: true,
    })
  },

  loadAllEntries: async () => {
    const rows = await db.select().from(lendBorrowEntries)
    set({ allEntries: rows.map(mapEntry) })
  },

  findContactByName: (name: string) => {
    const normalized = name.trim().toLowerCase()
    return get().contacts.find(c => c.name.trim().toLowerCase() === normalized)
  },

  addContact: async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Name required')
    const existing = get().findContactByName(trimmed)
    if (existing) return existing

    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(contacts).values({ id, name: trimmed, createdAt: now })
    const contact: Contact = { id, name: trimmed, createdAt: now }
    set({ contacts: [...get().contacts, contact].sort((a, b) => a.name.localeCompare(b.name)) })
    return contact
  },

  addEntry: async (data) => {
    if (data.amount <= 0) throw new Error('Amount must be positive')

    if (data.type === 'settle') {
      const balance = computePersonBalance(data.contactId, get().allEntries)
      if (balance === 0) throw new Error('Nothing to settle')
      if (data.amount > Math.abs(balance)) throw new Error('Amount exceeds balance')
    }

    const id = generateId()
    const now = new Date().toISOString()
    await db.insert(lendBorrowEntries).values({
      id,
      contactId: data.contactId,
      type: data.type,
      amount: data.amount,
      note: data.note?.trim() || null,
      date: data.date,
      createdAt: now,
    })

    await get().loadAllEntries()
    if (cachedMonthRange) {
      await get().loadEntries(cachedMonthRange.start, cachedMonthRange.end)
    }
  },

  deleteEntry: async (id: string) => {
    await db.delete(lendBorrowEntries).where(eq(lendBorrowEntries.id, id))
    await get().loadAllEntries()
    if (cachedMonthRange) {
      await get().loadEntries(cachedMonthRange.start, cachedMonthRange.end)
    }
  },

  deleteContact: async (id: string) => {
    const hasEntries = get().allEntries.some(e => e.contactId === id)
    if (hasEntries) {
      return { ok: false, error: 'Remove all transactions with this person first' }
    }
    await db.delete(contacts).where(eq(contacts.id, id))
    set({ contacts: get().contacts.filter(c => c.id !== id) })
    return { ok: true }
  },

  getPersonBalance: (contactId: string) =>
    computePersonBalance(contactId, get().allEntries),

  getTotalNetBalance: () => computeTotalNetBalance(get().contacts, get().allEntries),

  getLentOutTotal: () => computeLentOutAsset(get().contacts, get().allEntries),

  getYouOweTotal: () => computeYouOweLiability(get().contacts, get().allEntries),
}))

function mapEntry(row: typeof lendBorrowEntries.$inferSelect): LendBorrowEntry {
  return {
    id: row.id,
    contactId: row.contactId,
    type: row.type as LendBorrowType,
    amount: row.amount,
    note: row.note,
    date: row.date,
    createdAt: row.createdAt,
  }
}
