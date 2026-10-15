export type NudgeToggles = {
  budgetBreach: boolean
  savingsReminder: boolean
  efFloorWarning: boolean
  recurringDraft: boolean
}

export type NudgeFiredMap = Record<string, true>

export type NudgePrefsBlob = {
  toggles?: Partial<NudgeToggles>
  lastNotificationDate?: string | null
  fired?: NudgeFiredMap
}

const DEFAULT_TOGGLES: NudgeToggles = {
  budgetBreach: true,
  savingsReminder: true,
  efFloorWarning: true,
  recurringDraft: true,
}

export function defaultNudgeToggles(): NudgeToggles {
  return { ...DEFAULT_TOGGLES }
}

export function parseNudgePrefs(json: string | null | undefined): {
  toggles: NudgeToggles
  lastNotificationDate: string | null
  fired: NudgeFiredMap
} {
  if (!json?.trim()) {
    return {
      toggles: defaultNudgeToggles(),
      lastNotificationDate: null,
      fired: {},
    }
  }
  try {
    const blob = JSON.parse(json) as NudgePrefsBlob
    return {
      toggles: { ...DEFAULT_TOGGLES, ...blob.toggles },
      lastNotificationDate: blob.lastNotificationDate ?? null,
      fired: blob.fired ?? {},
    }
  } catch {
    return {
      toggles: defaultNudgeToggles(),
      lastNotificationDate: null,
      fired: {},
    }
  }
}

export function serializeNudgePrefs(input: {
  nudgeToggles: NudgeToggles
  lastNotificationDate: string | null
  nudgeFired: NudgeFiredMap
}): string {
  const blob: NudgePrefsBlob = {
    toggles: input.nudgeToggles,
    lastNotificationDate: input.lastNotificationDate,
    fired: input.nudgeFired,
  }
  return JSON.stringify(blob)
}
