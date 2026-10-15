import { create } from 'zustand'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { playbook } from '@/db/schema'
import { setActiveCurrency } from '@/lib/format'
import {
  defaultNudgeToggles,
  parseNudgePrefs,
  serializeNudgePrefs,
  type NudgeFiredMap,
  type NudgeToggles,
} from '@/lib/nudge-prefs'

export type { NudgeToggles } from '@/lib/nudge-prefs'

interface PlaybookState {
  userName: string | null
  currency: string
  monthlyIncome: number
  monthStartDay: number
  earlyMonthStartDate: string | null
  fallbackBucketId: string | null
  efFloor: number
  efStartBalance: number
  isOnboarded: boolean
  lastChecklistMonth: string | null
  lastChecklistPromptMonth: string | null
  lastBalanceRolloverMonth: string | null
  userAge: number | null
  carriedForwardBalance: number
  lastSurplusRolloverMonth: string | null
  lastPersonalRebalancePromptMonth: string | null
  personalRecoveryDebt: number
  personalNormalTopUp: number | null
  nudgeToggles: NudgeToggles
  lastNotificationDate: string | null
  nudgeFired: NudgeFiredMap
  isLoaded: boolean
  loadPlaybook: () => Promise<void>
  updatePlaybook: (patch: Partial<Omit<PlaybookState, 'isLoaded' | 'loadPlaybook' | 'updatePlaybook' | 'setOnboarded' | 'startPersonalRecovery' | 'resetPersonalRecovery'>>) => Promise<void>
  setOnboarded: () => Promise<void>
  startPersonalRecovery: (overspent: number, normalTopUp: number) => Promise<void>
  resetPersonalRecovery: () => Promise<void>
}

// Only these keys map to playbook columns — nudgeToggles and friends live in memory only.
const PLAYBOOK_COLUMNS = {
  userName: true,
  currency: true,
  monthlyIncome: true,
  monthStartDay: true,
  earlyMonthStartDate: true,
  fallbackBucketId: true,
  efFloor: true,
  efStartBalance: true,
  isOnboarded: true,
  lastChecklistMonth: true,
  lastChecklistPromptMonth: true,
  lastBalanceRolloverMonth: true,
  userAge: true,
  carriedForwardBalance: true,
  lastSurplusRolloverMonth: true,
  lastPersonalRebalancePromptMonth: true,
  personalRecoveryDebt: true,
  personalNormalTopUp: true,
} as const

export const usePlaybookStore = create<PlaybookState>((set, get) => ({
  userName: null,
  currency: 'NPR',
  monthlyIncome: 125000,
  monthStartDay: 1,
  earlyMonthStartDate: null,
  fallbackBucketId: null,
  efFloor: 300000,
  efStartBalance: 0,
  isOnboarded: false,
  lastChecklistMonth: null,
  lastChecklistPromptMonth: null,
  lastBalanceRolloverMonth: null,
  userAge: null,
  carriedForwardBalance: 0,
  lastSurplusRolloverMonth: null,
  lastPersonalRebalancePromptMonth: null,
  personalRecoveryDebt: 0,
  personalNormalTopUp: null,
  nudgeToggles: defaultNudgeToggles(),
  lastNotificationDate: null,
  nudgeFired: {},
  isLoaded: false,

  loadPlaybook: async () => {
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      const row = rows[0]
      const nudgePrefs = parseNudgePrefs(row.nudgePrefsJson)
      set({
        userName: row.userName ?? null,
        currency: row.currency || 'NPR',
        monthlyIncome: row.monthlyIncome,
        monthStartDay: row.monthStartDay,
        earlyMonthStartDate: row.earlyMonthStartDate ?? null,
        fallbackBucketId: row.fallbackBucketId ?? null,
        efFloor: row.efFloor,
        efStartBalance: row.efStartBalance ?? 0,
        isOnboarded: row.isOnboarded,
        lastChecklistMonth: row.lastChecklistMonth ?? null,
        lastChecklistPromptMonth: row.lastChecklistPromptMonth ?? null,
        lastBalanceRolloverMonth: row.lastBalanceRolloverMonth ?? null,
        userAge: row.userAge ?? null,
        carriedForwardBalance: row.carriedForwardBalance ?? 0,
        lastSurplusRolloverMonth: row.lastSurplusRolloverMonth ?? null,
        lastPersonalRebalancePromptMonth: row.lastPersonalRebalancePromptMonth ?? null,
        personalRecoveryDebt: row.personalRecoveryDebt ?? 0,
        personalNormalTopUp: row.personalNormalTopUp ?? null,
        nudgeToggles: nudgePrefs.toggles,
        lastNotificationDate: nudgePrefs.lastNotificationDate,
        nudgeFired: nudgePrefs.fired,
        isLoaded: true,
      })
      setActiveCurrency(row.currency || 'NPR')
    } else {
      setActiveCurrency('NPR')
      set({ isLoaded: true })
    }
  },

  updatePlaybook: async (patch) => {
    const prev = get()
    set(patch as any)
    if (patch.currency) setActiveCurrency(patch.currency)
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length === 0) {
      const state = get()
      await db.insert(playbook).values({
        userName: state.userName,
        currency: state.currency,
        monthlyIncome: state.monthlyIncome,
        monthStartDay: state.monthStartDay,
        earlyMonthStartDate: state.earlyMonthStartDate,
        fallbackBucketId: state.fallbackBucketId,
        efFloor: state.efFloor,
        efStartBalance: state.efStartBalance,
        isOnboarded: state.isOnboarded,
        lastChecklistMonth: state.lastChecklistMonth,
        lastChecklistPromptMonth: state.lastChecklistPromptMonth,
        lastBalanceRolloverMonth: state.lastBalanceRolloverMonth,
        userAge: state.userAge,
        carriedForwardBalance: state.carriedForwardBalance,
        lastSurplusRolloverMonth: state.lastSurplusRolloverMonth,
        lastPersonalRebalancePromptMonth: state.lastPersonalRebalancePromptMonth,
        personalRecoveryDebt: state.personalRecoveryDebt,
        personalNormalTopUp: state.personalNormalTopUp,
      })
      return
    }

    const write = async () => {
      const state = get()
      const values = Object.fromEntries(
        Object.keys(patch)
          .filter(key => key in PLAYBOOK_COLUMNS)
          .map(key => [key, (state as any)[key]]),
      )
      const nudgeKeys = ['nudgeToggles', 'lastNotificationDate', 'nudgeFired'] as const
      if (nudgeKeys.some(key => key in patch)) {
        values.nudgePrefsJson = serializeNudgePrefs({
          nudgeToggles: state.nudgeToggles,
          lastNotificationDate: state.lastNotificationDate,
          nudgeFired: state.nudgeFired,
        })
      }
      if (Object.keys(values).length === 0) return
      await db.update(playbook).set(values).where(eq(playbook.id, rows[0].id))
    }
    try {
      await write()
    } catch (error) {
      // Older installs may miss new playbook columns until patches run.
      const { applySchemaPatches } = await import('@/db/client')
      applySchemaPatches()
      try {
        await write()
      } catch (retryError) {
        // Roll back optimistic UI state so a failed Paid early can't leave a half-applied month.
        set({
          userName: prev.userName,
          currency: prev.currency,
          monthlyIncome: prev.monthlyIncome,
          monthStartDay: prev.monthStartDay,
          earlyMonthStartDate: prev.earlyMonthStartDate,
          fallbackBucketId: prev.fallbackBucketId,
          efFloor: prev.efFloor,
          efStartBalance: prev.efStartBalance,
          isOnboarded: prev.isOnboarded,
          lastChecklistMonth: prev.lastChecklistMonth,
          lastChecklistPromptMonth: prev.lastChecklistPromptMonth,
          lastBalanceRolloverMonth: prev.lastBalanceRolloverMonth,
          userAge: prev.userAge,
          carriedForwardBalance: prev.carriedForwardBalance,
          lastSurplusRolloverMonth: prev.lastSurplusRolloverMonth,
          lastPersonalRebalancePromptMonth: prev.lastPersonalRebalancePromptMonth,
          personalRecoveryDebt: prev.personalRecoveryDebt,
          personalNormalTopUp: prev.personalNormalTopUp,
          nudgeToggles: prev.nudgeToggles,
          lastNotificationDate: prev.lastNotificationDate,
          nudgeFired: prev.nudgeFired,
        })
        setActiveCurrency(prev.currency)
        throw retryError
      }
    }
  },

  setOnboarded: async () => {
    set({ isOnboarded: true })
    const rows = await db.select().from(playbook).limit(1)
    if (rows.length > 0) {
      await db.update(playbook).set({ isOnboarded: true }).where(eq(playbook.id, rows[0].id))
    }
  },

  startPersonalRecovery: async (overspent, normalTopUp) => {
    if (overspent <= 0) return
    const state = get()
    const debt = (state.personalRecoveryDebt || 0) + overspent
    const normal =
      state.personalNormalTopUp != null && state.personalNormalTopUp > 0
        ? state.personalNormalTopUp
        : normalTopUp
    await get().updatePlaybook({
      personalRecoveryDebt: debt,
      personalNormalTopUp: normal,
    })
  },

  resetPersonalRecovery: async () => {
    await get().updatePlaybook({
      personalRecoveryDebt: 0,
      personalNormalTopUp: null,
    })
  },
}))
