import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { playbook } from '@/db/schema'

interface PlaybookState {
  userName: string | null
  monthlyIncome: number
  monthStartDay: number
  fallbackBucketId: string | null
  efFloor: number
  isOnboarded: boolean
  lastChecklistMonth: string | null
  isLoaded: boolean
  loadPlaybook: () => Promise<void>
  updatePlaybook: (patch: Partial<Omit<PlaybookState, 'isLoaded' | 'loadPlaybook' | 'updatePlaybook'>>) => Promise<void>
  setOnboarded: () => Promise<void>
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  userName: null,
  monthlyIncome: 125000,
  monthStartDay: 1,
  fallbackBucketId: null,
  efFloor: 150000,
  isOnboarded: false,
  lastChecklistMonth: null,
  isLoaded: false,

  loadPlaybook: async () => {
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      const row = rows[0]
      set({
        userName: row.userName ?? null,
        monthlyIncome: row.monthlyIncome,
        monthStartDay: row.monthStartDay,
        fallbackBucketId: row.fallbackBucketId ?? null,
        efFloor: row.efFloor,
        isOnboarded: row.isOnboarded,
        lastChecklistMonth: row.lastChecklistMonth ?? null,
        isLoaded: true,
      })
    } else {
      set({ isLoaded: true })
    }
  },

  updatePlaybook: async (patch) => {
    set(patch as any)
    const state = get()
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      await db.update(playbook).set({
        userName: state.userName,
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        isOnboarded: state.isOnboarded,
        lastChecklistMonth: state.lastChecklistMonth,
      }).where(eq(playbook.id, rows[0].id))
    } else {
      // Create record if not exists (should already happen in seedDefaults, but good to have)
      await db.insert(playbook).values({
        userName: state.userName,
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        isOnboarded: state.isOnboarded,
        lastChecklistMonth: state.lastChecklistMonth,
      })
    }
  },

  setOnboarded: async () => {
    set({ isOnboarded: true })
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      await db.update(playbook).set({ isOnboarded: true }).where(eq(playbook.id, rows[0].id))
    }
  },
}))
