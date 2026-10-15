import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import { formatMoney } from '@/lib/format'
import { EF_BUCKET_ID } from '@/constants/defaults'
import { usePlaybookStore } from '@/store/playbook'
import type { NudgeToggles } from '@/lib/nudge-prefs'

export type { NudgeToggles } from '@/lib/nudge-prefs'

export type NudgeType =
  | 'budgetBreach'
  | 'budgetExceeded'
  | 'savingsReminder'
  | 'efFloorWarning'
  | 'efMilestone'
  | 'flaggedPending'
  | 'recurringDraft'

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

type NotificationsModule = typeof import('expo-notifications')
let Notifications: NotificationsModule | null = null
if (!isExpoGo) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require('expo-notifications') as NotificationsModule
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false

  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function setupNotificationChannel() {
  if (Platform.OS !== 'android' || !Notifications) return

  await Notifications.setNotificationChannelAsync('spendsense_nudges', {
    name: 'UnSpoil',
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

function hasNotifiedToday(lastNotificationDate: string | null): boolean {
  return lastNotificationDate === todayKey()
}

function hasFiredNudge(dedupeKey: string): boolean {
  return usePlaybookStore.getState().nudgeFired[dedupeKey] === true
}

async function markNudgeFired(dedupeKey: string): Promise<void> {
  const pb = usePlaybookStore.getState()
  const today = todayKey()
  await pb.updatePlaybook({
    nudgeFired: { ...pb.nudgeFired, [dedupeKey]: true },
    lastNotificationDate: today,
  })
}

async function scheduleNudge(
  type: NudgeType,
  dedupeKey: string,
  title: string,
  body: string,
): Promise<boolean> {
  if (!Notifications) return false

  const { nudgeToggles, lastNotificationDate } = usePlaybookStore.getState()
  const toggleKey = mapTypeToToggle(type)
  if (toggleKey && !nudgeToggles[toggleKey]) return false
  if (hasFiredNudge(dedupeKey)) return false
  if (hasNotifiedToday(lastNotificationDate)) return false

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

  await markNudgeFired(dedupeKey)
  return true
}

function mapTypeToToggle(type: NudgeType): keyof NudgeToggles | null {
  switch (type) {
    case 'budgetBreach':
    case 'budgetExceeded':
      return 'budgetBreach'
    case 'savingsReminder':
      return 'savingsReminder'
    case 'efFloorWarning':
    case 'efMilestone':
      return 'efFloorWarning'
    case 'recurringDraft':
      return 'recurringDraft'
    case 'flaggedPending':
      return null
    default:
      return null
  }
}

export async function checkAndScheduleAll(params: {
  periodKey: string
  spentByBucket: Record<string, { spent: number; limit: number; name: string }>
  unconfirmedSavings: { id: string; name: string; daysSinceMonthStart: number }[]
  efBalance: number
  efFloor: number
  recurringDraftCount: number
  daysSincePeriodStart: number
  flaggedCount: number
  flaggedAgeDays: number
}): Promise<void> {
  if (!Notifications) return
  const { lastNotificationDate } = usePlaybookStore.getState()
  if (hasNotifiedToday(lastNotificationDate)) return

  const {
    periodKey,
    spentByBucket,
    unconfirmedSavings,
    efBalance,
    efFloor,
    recurringDraftCount,
    daysSincePeriodStart,
    flaggedCount,
    flaggedAgeDays,
  } = params

  for (const [bucketId, b] of Object.entries(spentByBucket)) {
    if (b.limit > 0 && b.spent >= b.limit) {
      const sent = await scheduleNudge(
        'budgetExceeded',
        `budgetExceeded:${bucketId}:${periodKey}`,
        `${b.name} budget reached`,
        `You've used your full ${b.name} budget for this month.`,
      )
      if (sent) return
    }
  }

  for (const [bucketId, b] of Object.entries(spentByBucket)) {
    if (b.limit > 0 && b.spent >= b.limit * 0.8 && b.spent < b.limit) {
      const remaining = b.limit - b.spent
      const sent = await scheduleNudge(
        'budgetBreach',
        `budgetBreach:${bucketId}:${periodKey}`,
        `${b.name} is at 80%`,
        `${formatMoney(Math.round(remaining))} left in ${b.name}.`,
      )
      if (sent) return
    }
  }

  if (efFloor > 0 && efBalance < efFloor) {
    const sent = await scheduleNudge(
      'efFloorWarning',
      `efFloorBelow:${periodKey}`,
      'Emergency Fund below floor',
      `Your EF is ${formatMoney(Math.round(efBalance))} — floor is ${formatMoney(Math.round(efFloor))}.`,
    )
    if (sent) return
  }

  if (efFloor > 0) {
    if (efBalance >= efFloor && !hasFiredNudge('efMilestone:ef_stage2')) {
      const sent = await scheduleNudge(
        'efMilestone',
        'efMilestone:ef_stage2',
        'Emergency Fund fully funded!',
        'Your Emergency Fund has reached your target. Great discipline!',
      )
      if (sent) return
    }
    if (efBalance >= 150000 && !hasFiredNudge('efMilestone:ef_stage1')) {
      const sent = await scheduleNudge(
        'efMilestone',
        'efMilestone:ef_stage1',
        'Emergency Fund hit Stage 1!',
        `You have ${formatMoney(150000)} in your Emergency Fund. Keep going!`,
      )
      if (sent) return
    }
  }

  if (recurringDraftCount > 0 && daysSincePeriodStart >= 3) {
    const sent = await scheduleNudge(
      'recurringDraft',
      `recurringDraft:${periodKey}`,
      recurringDraftCount === 1 ? 'Recurring draft waiting' : `${recurringDraftCount} recurring drafts waiting`,
      'Open UnSpoil and confirm recurring entries so they count in your plan.',
    )
    if (sent) return
  }

  for (const s of unconfirmedSavings) {
    if (s.daysSinceMonthStart >= 3) {
      const sent = await scheduleNudge(
        'savingsReminder',
        `savingsReminder:${s.id}:${periodKey}`,
        `${s.name} transfer pending`,
        `${s.name} transfer not confirmed yet this month.`,
      )
      if (sent) return
    }
  }

  if (flaggedCount > 0 && flaggedAgeDays >= 3) {
    const sent = await scheduleNudge(
      'flaggedPending',
      `flaggedPending:${periodKey}`,
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

export function computeEfBalance(
  efStartBalance: number,
  allTransactions: { bucketId: string | null; type: string; amount: number }[],
): number {
  const contributions = allTransactions
    .filter(t => t.bucketId === EF_BUCKET_ID && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  return efStartBalance + contributions
}
