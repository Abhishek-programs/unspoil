import * as Notifications from 'expo-notifications'
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

// In-memory state — persisted via Settings UI calling back to the store
let nudgeToggles: NudgeToggles = { ...DEFAULT_TOGGLES }
let lastNotificationDate: string | null = null
// Track one-time milestones so they never repeat
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
  if (Platform.OS === 'web') return false

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * Configure notification channel for Android
 */
export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('spendsense_nudges', {
      name: 'SpendSense Nudges',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#16A34A',
    })
  }
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
  // Check toggle
  const toggleKey = mapTypeToToggle(type)
  if (toggleKey && !nudgeToggles[toggleKey]) return false

  // 1-per-day cap
  if (hasNotifiedToday()) return false

  // Quiet hours: schedule for 8am next day
  let trigger: Notifications.NotificationTriggerInput = null
  if (isQuietHours()) {
    const tomorrow8am = new Date()
    tomorrow8am.setDate(tomorrow8am.getDate() + (tomorrow8am.getHours() >= 22 ? 1 : 0))
    tomorrow8am.setHours(8, 0, 0, 0)
    trigger = { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow8am }
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
      return null // always fires if conditions met
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
  if (hasNotifiedToday()) return

  const { spentByBucket, unconfirmedSavings, efBalance, efFloor, flaggedCount, flaggedAgeDays } = params

  // Priority 1: Budget exceeded (100%)
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

  // Priority 2: Budget breach (80%)
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

  // Priority 3: EF milestones (one-time)
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

  // Priority 4: Savings unconfirmed 3+ days after month start
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

  // Priority 5: Flagged transactions sitting 3+ days
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
  await Notifications.cancelAllScheduledNotificationsAsync()
}
