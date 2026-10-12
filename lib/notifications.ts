import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'

export type NudgeType =
  | 'budgetBreach'
  | 'budgetExceeded'
  | 'savingsReminder'
  | 'efFloorWarning'
  | 'efMilestone'
  | 'flaggedPending'
  | 'recurringDraft'

export interface NudgeToggles {
  budgetBreach: boolean
  savingsReminder: boolean
  efFloorWarning: boolean
  recurringDraft: boolean
}

const DEFAULT_TOGGLES: NudgeToggles = {
  budgetBreach: true,
  savingsReminder: true,
  efFloorWarning: true,
  recurringDraft: true,
}

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

// expo-notifications remote APIs were removed from Expo Go (SDK 53+).
// Load only in a real native / development build.
type NotificationsModule = typeof import('expo-notifications')
let Notifications: NotificationsModule | null = null
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications') as NotificationsModule
}

let nudgeToggles: NudgeToggles = { ...DEFAULT_TOGGLES }
let lastNotificationDate: string | null = null
let firedMilestones: Set<string> = new Set()

export function setNudgeToggles(toggles: NudgeToggles) {
  nudgeToggles = { ...toggles }
}

export function getNudgeToggles(): NudgeToggles {
  return { ...nudgeToggles }
}

export function setLastNotificationDate(date: string | null) {
  lastNotificationDate = date
}

export function markMilestoneFired(key: string) {
  firedMilestones.add(key)
}

export function hasMilestoneFired(key: string): boolean {
  return firedMilestones.has(key)
}

/**
 * Request notification permissions. Call once after onboarding.
 */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * Configure notification channel for Android
 */
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android' || !Notifications) return

  await Notifications.setNotificationChannelAsync('spendsense_nudges', {
    name: 'SpendSense Nudges',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#16A34A',
  })
}

function isQuietHours(): boolean {
  const hour = new Date().getHours()
  return hour >= 22 || hour < 8
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function hasNotifiedToday(): boolean {
  return lastNotificationDate === todayKey()
}

/**
 * Schedule a local notification. Respects 1-per-day cap and quiet hours.
 * Returns true if notification was scheduled, false if suppressed.
 */
export async function scheduleNudge(
  type: NudgeType,
  title: string,
  body: string,
): Promise<boolean> {
  if (!Notifications) return false

  const toggleKey = mapTypeToToggle(type)
  if (toggleKey && !nudgeToggles[toggleKey]) return false

  if (hasNotifiedToday()) return false

  let trigger: import('expo-notifications').NotificationTriggerInput = null
  if (isQuietHours()) {
    const tomorrow8am = new Date()
    tomorrow8am.setDate(tomorrow8am.getDate() + (tomorrow8am.getHours() >= 22 ? 1 : 0))
    tomorrow8am.setHours(8, 0, 0, 0)
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow8am,
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'spendsense_nudges' } : {}),
    },
    trigger,
  })

  lastNotificationDate = todayKey()
  return true
}

function mapTypeToToggle(type: NudgeType): keyof NudgeToggles | null {
  switch (type) {
    case 'budgetBreach':
    case 'budgetExceeded':
      return 'budgetBreach'
    case 'savingsReminder':
    case 'recurringDraft':
      return 'savingsReminder'
    case 'efFloorWarning':
    case 'efMilestone':
      return 'efFloorWarning'
    case 'flaggedPending':
      return null
    default:
      return null
  }
}

/**
 * Evaluate all trigger conditions and schedule the most urgent nudge.
 * Called on app open from _layout.tsx.
 */
export async function checkAndScheduleAll(params: {
  spentByBucket: Record<string, { spent: number; limit: number; name: string }>
  unconfirmedSavings: { name: string; daysSinceMonthStart: number }[]
  efBalance: number
  efFloor: number
  flaggedCount: number
  flaggedAgeDays: number
}): Promise<void> {
  if (!Notifications || hasNotifiedToday()) return

  const { spentByBucket, unconfirmedSavings, efBalance, efFloor, flaggedCount, flaggedAgeDays } = params

  for (const [, b] of Object.entries(spentByBucket)) {
    if (b.limit > 0 && b.spent >= b.limit) {
      const sent = await scheduleNudge(
        'budgetExceeded',
        `${b.name} budget reached`,
        `You've used your full ${b.name} budget for this month.`,
      )
      if (sent) return
    }
  }

  for (const [, b] of Object.entries(spentByBucket)) {
    if (b.limit > 0 && b.spent >= b.limit * 0.8 && b.spent < b.limit) {
      const remaining = b.limit - b.spent
      const sent = await scheduleNudge(
        'budgetBreach',
        `${b.name} is at 80%`,
        `NPR ${Math.round(remaining).toLocaleString()} left in ${b.name}.`,
      )
      if (sent) return
    }
  }

  if (efFloor > 0) {
    if (efBalance >= efFloor && !hasMilestoneFired('ef_stage2')) {
      markMilestoneFired('ef_stage2')
      const sent = await scheduleNudge(
        'efMilestone',
        'Emergency Fund fully funded!',
        'Your Emergency Fund has reached your target. Great discipline!',
      )
      if (sent) return
    }
    if (efBalance >= 150000 && !hasMilestoneFired('ef_stage1')) {
      markMilestoneFired('ef_stage1')
      const sent = await scheduleNudge(
        'efMilestone',
        'Emergency Fund hit Stage 1!',
        'You have NPR 1,50,000 in your Emergency Fund. Keep going!',
      )
      if (sent) return
    }
  }

  for (const s of unconfirmedSavings) {
    if (s.daysSinceMonthStart >= 3) {
      const sent = await scheduleNudge(
        'savingsReminder',
        `${s.name} transfer pending`,
        `${s.name} transfer not confirmed yet this month.`,
      )
      if (sent) return
    }
  }

  if (flaggedCount > 0 && flaggedAgeDays >= 3) {
    const sent = await scheduleNudge(
      'flaggedPending',
      `${flaggedCount} transaction${flaggedCount > 1 ? 's' : ''} waiting`,
      `${flaggedCount} transaction${flaggedCount > 1 ? 's are' : ' is'} waiting to be categorized.`,
    )
    if (sent) return
  }
}

export async function cancelAllNudges(): Promise<void> {
  if (!Notifications) return
  await Notifications.cancelAllScheduledNotificationsAsync()
}
