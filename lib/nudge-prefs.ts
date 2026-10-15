export type NudgeToggles = {
  budgetBreach: boolean
  savingsReminder: boolean
  efFloorWarning: boolean
  recurringDraft: boolean
}

export type NudgeFiredMap = Record<string, true>

export type AutoBackupPrefs = {
  enabled: boolean
  hour: number
  minute: number
  lastRunDate: string | null
}

export type NudgePrefsBlob = {
  toggles?: Partial<NudgeToggles>
  lastNotificationDate?: string | null
  fired?: NudgeFiredMap
  autoBackup?: Partial<AutoBackupPrefs>
}

export function defaultAutoBackupPrefs(): AutoBackupPrefs {
  return { enabled: true, hour: 21, minute: 0, lastRunDate: null }
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
  autoBackup: AutoBackupPrefs
} {
  if (!json?.trim()) {
    return {
      toggles: defaultNudgeToggles(),
      lastNotificationDate: null,
      fired: {},
      autoBackup: defaultAutoBackupPrefs(),
    }
  }
  try {
    const blob = JSON.parse(json) as NudgePrefsBlob
    return {
      toggles: { ...DEFAULT_TOGGLES, ...blob.toggles },
      lastNotificationDate: blob.lastNotificationDate ?? null,
      fired: blob.fired ?? {},
      autoBackup: { ...defaultAutoBackupPrefs(), ...blob.autoBackup },
    }
  } catch {
    return {
      toggles: defaultNudgeToggles(),
      lastNotificationDate: null,
      fired: {},
      autoBackup: defaultAutoBackupPrefs(),
    }
  }
}

export function serializeNudgePrefs(input: {
  nudgeToggles: NudgeToggles
  lastNotificationDate: string | null
  nudgeFired: NudgeFiredMap
  autoBackup: AutoBackupPrefs
}): string {
  const blob: NudgePrefsBlob = {
    toggles: input.nudgeToggles,
    lastNotificationDate: input.lastNotificationDate,
    fired: input.nudgeFired,
    autoBackup: input.autoBackup,
  }
  return JSON.stringify(blob)
}
