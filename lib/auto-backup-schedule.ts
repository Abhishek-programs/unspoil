import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { cancelBackupAlarm, scheduleBackupAlarm } from '@/lib/payment-watch'
import type { AutoBackupPrefs } from '@/lib/nudge-prefs'

export const AUTO_BACKUP_CHANNEL_ID = 'unspoil_auto_backup'

// Older builds scheduled a daily notification that never cleared itself.
const LEGACY_NOTIFICATION_ID = 'unspoil-auto-backup-daily'
const LEGACY_TASK = 'unspoil-auto-backup'

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export async function ensureAutoBackupNotificationChannel() {
  if (Platform.OS !== 'android' || isExpoGo) return
  await Notifications.setNotificationChannelAsync(AUTO_BACKUP_CHANNEL_ID, {
    name: 'Auto backup',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
    sound: null,
    enableLights: false,
    enableVibrate: false,
  })
}

export async function syncAutoBackupSchedule(prefs: AutoBackupPrefs) {
  if (isExpoGo || Platform.OS !== 'android') return

  await ensureAutoBackupNotificationChannel()
  await Notifications.cancelScheduledNotificationAsync(LEGACY_NOTIFICATION_ID).catch(() => {})
  await Notifications.unregisterTaskAsync(LEGACY_TASK).catch(() => {})

  if (prefs.enabled) await scheduleBackupAlarm(prefs.hour, prefs.minute)
  else await cancelBackupAlarm()
}
