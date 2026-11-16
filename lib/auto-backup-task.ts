import * as TaskManager from 'expo-task-manager'
import * as Notifications from 'expo-notifications'
import { runAutoBackupJob, shouldRunAutoBackupNow } from '@/lib/auto-backup'
import { hideBackupNotice, showBackupNotice } from '@/lib/payment-watch'
import { usePlaybookStore } from '@/store/playbook'

export const AUTO_BACKUP_TASK = 'unspoil-auto-backup'
export const AUTO_BACKUP_NOTIFICATION_ID = 'unspoil-auto-backup-daily'
export const AUTO_BACKUP_CHANNEL_ID = 'unspoil_auto_backup'

/** The progress notice stays at least this long so it reads as "backed up", not a flicker. */
const NOTICE_MIN_MS = 2000

TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  const started = Date.now()
  // The scheduled notification only wakes this task; swap it for the progress notice.
  await Notifications.dismissNotificationAsync(AUTO_BACKUP_NOTIFICATION_ID).catch(() => {})
  try {
    // With the app closed nothing has loaded the playbook yet.
    const pb = usePlaybookStore.getState()
    if (!pb.isLoaded) await pb.loadPlaybook()
    const loaded = usePlaybookStore.getState()
    if (!loaded.isOnboarded || !shouldRunAutoBackupNow(loaded.autoBackup)) return
    await showBackupNotice(AUTO_BACKUP_CHANNEL_ID, 'UnSpoil backup', 'Saving your backup…')
    await runAutoBackupJob()
    const left = NOTICE_MIN_MS - (Date.now() - started)
    if (left > 0) await new Promise(resolve => setTimeout(resolve, left))
  } catch {
    // Background run failed; AppState catch-up may retry when the app opens.
  } finally {
    await hideBackupNotice()
  }
})
