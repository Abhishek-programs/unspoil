import Constants, { ExecutionEnvironment } from 'expo-constants'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { AUTO_BACKUP_TASK } from '@/lib/auto-backup-task'
import type { AutoBackupPrefs } from '@/lib/nudge-prefs'

export const AUTO_BACKUP_NOTIFICATION_ID = 'unspoil-auto-backup-daily'

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export async function ensureAutoBackupNotificationChannel() {
  if (Platform.OS !== 'android' || isExpoGo) return
  await Notifications.setNotificationChannelAsync('unspoil_auto_backup', {
    name: 'Auto backup',
    importance: Notifications.AndroidImportance.LOW,
    vibrationPattern: [0],
    sound: null,
    enableLights: false,
    enableVibrate: false,
  })
}

export async function syncAutoBackupSchedule(prefs: AutoBackupPrefs) {
  if (isExpoGo || Platform.OS === 'web') return

  await ensureAutoBackupNotificationChannel()

  try {
    await Notifications.registerTaskAsync(AUTO_BACKUP_TASK)
  } catch {
    // Already registered or unavailable
  }

  await Notifications.cancelScheduledNotificationAsync(AUTO_BACKUP_NOTIFICATION_ID)

  if (!prefs.enabled) return

  await Notifications.scheduleNotificationAsync({
    identifier: AUTO_BACKUP_NOTIFICATION_ID,
    content: {
      title: 'UnSpoil backup',
      body: 'Saving your local backup…',
      data: { type: 'auto-backup' },
      ...(Platform.OS === 'android' ? { channelId: 'unspoil_auto_backup' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: prefs.hour,
      minute: prefs.minute,
    },
  })
}
