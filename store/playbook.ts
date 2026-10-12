import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { playbook } from '@/db/schema'

interface PlaybookState {
  monthlyIncome: number
  monthStartDay: number
  fallbackBucketId: string | null
  efFloor: number
  isOnboarded: boolean
  isLoaded: boolean
  loadPlaybook: () => Promise<void>
  updatePlaybook: (patch: Partial<Omit<PlaybookState, 'isLoaded' | 'loadPlaybook' | 'updatePlaybook'>>) => Promise<void>
  setOnboarded: () => Promise<void>
}

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  monthlyIncome: 125000,
  monthStartDay: 1,
  fallbackBucketId: null,
  efFloor: 150000,
  isOnboarded: false,
  isLoaded: false,

  loadPlaybook: async () => {
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      const row = rows[0]
      set({
        monthlyIncome: row.monthlyIncome,
        monthStartDay: row.monthStartDay,
        fallbackBucketId: row.fallbackBucketId ?? null,
        efFloor: row.efFloor,
        isOnboarded: row.isOnboarded,
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
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        isOnboarded: state.isOnboarded,
      }).where(eq(playbook.id, rows[0].id))
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
