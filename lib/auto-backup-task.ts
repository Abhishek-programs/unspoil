import { runAutoBackupJob, shouldRunAutoBackupNow } from '@/lib/auto-backup'
import { AUTO_BACKUP_CHANNEL_ID } from '@/lib/auto-backup-schedule'
import { hideBackupNotice, showBackupNotice } from '@/lib/payment-watch'
import { usePlaybookStore } from '@/store/playbook'

/** Headless JS task the native nightly alarm starts (see BackupAlarm.kt). */
export const AUTO_BACKUP_HEADLESS_TASK = 'UnSpoilAutoBackup'

/** The progress notice stays at least this long so it reads as "backed up", not a flicker. */
const NOTICE_MIN_MS = 2000

export async function runHeadlessAutoBackup() {
  try {
    // With the app closed nothing has loaded the playbook yet.
    const pb = usePlaybookStore.getState()
    if (!pb.isLoaded) await pb.loadPlaybook()
    const loaded = usePlaybookStore.getState()
    if (!loaded.isOnboarded || !shouldRunAutoBackupNow(loaded.autoBackup)) return
    const started = Date.now()
    await showBackupNotice(AUTO_BACKUP_CHANNEL_ID, 'UnSpoil backup', 'Saving your backup…')
    await runAutoBackupJob()
    const left = NOTICE_MIN_MS - (Date.now() - started)
    if (left > 0) await new Promise(resolve => setTimeout(resolve, left))
  } catch {
    // Background run failed; the app catches up the next time it opens.
  } finally {
    await hideBackupNotice()
  }
}
