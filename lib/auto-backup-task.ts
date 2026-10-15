import * as TaskManager from 'expo-task-manager'
import { runAutoBackupJob } from '@/lib/auto-backup'

export const AUTO_BACKUP_TASK = 'unspoil-auto-backup'

TaskManager.defineTask(AUTO_BACKUP_TASK, async () => {
  try {
    await runAutoBackupJob()
  } catch {
    // Background run failed; AppState catch-up may retry when the app opens.
  }
})
