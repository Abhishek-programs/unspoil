import {
  documentDirectory,
  deleteAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy'
import { exportBackup } from '@/lib/backup'
import {
  backupStamp,
  getBackupFolder,
  listFolderBackups,
  writeFolderBackup,
} from '@/lib/backup-folder'
import { toLocalDateKey } from '@/lib/month'
import type { AutoBackupPrefs } from '@/lib/nudge-prefs'
import { usePlaybookStore } from '@/store/playbook'

export const AUTO_BACKUP_MAX_FILES = 3
const AUTO_BACKUP_DIR = `${documentDirectory}auto-backups/`

function autoBackupFilename(now = new Date()): string {
  return `unspoil-auto-${backupStamp(now)}.json`
}

export function autoBackupDirectory(): string {
  return AUTO_BACKUP_DIR
}

export async function listAutoBackupFiles(): Promise<
  { name: string; uri: string; modificationTime: number }[]
> {
  const info = await getInfoAsync(AUTO_BACKUP_DIR)
  if (!info.exists) return []
  const names = await readDirectoryAsync(AUTO_BACKUP_DIR)
  const jsonNames = names.filter(n => n.endsWith('.json'))
  const rows = await Promise.all(
    jsonNames.map(async name => {
      const uri = `${AUTO_BACKUP_DIR}${name}`
      const fileInfo = await getInfoAsync(uri)
      return {
        name,
        uri,
        modificationTime: fileInfo.exists ? (fileInfo.modificationTime ?? 0) : 0,
      }
    }),
  )
  return rows.sort((a, b) => b.modificationTime - a.modificationTime)
}

async function pruneAutoBackups() {
  const files = await listAutoBackupFiles()
  for (const file of files.slice(AUTO_BACKUP_MAX_FILES)) {
    await deleteAsync(file.uri, { idempotent: true })
  }
}

export type AutoBackupResult = { uri: string; inFolder: boolean }

async function writePhoneAutoBackup(json: string): Promise<string> {
  await makeDirectoryAsync(AUTO_BACKUP_DIR, { intermediates: true })
  const uri = `${AUTO_BACKUP_DIR}${autoBackupFilename()}`
  await writeAsStringAsync(uri, json)
  await pruneAutoBackups()
  return uri
}

/**
 * Writes to the backup folder (UnSpoil/Auto) when one is set, else to app
 * storage. If the folder is gone or its permission was revoked, app storage
 * still gets the backup so a night is never skipped.
 */
export async function writeAutoBackupFile(): Promise<AutoBackupResult> {
  const json = await exportBackup()
  const folder = await getBackupFolder()
  if (folder) {
    try {
      const uri = await writeFolderBackup(folder.autoUri, autoBackupFilename(), json)
      const files = await listFolderBackups(folder.autoUri)
      for (const file of files.slice(AUTO_BACKUP_MAX_FILES)) {
        await deleteAsync(file.uri, { idempotent: true })
      }
      return { uri, inFolder: true }
    } catch {
      // Fall through to app storage.
    }
  }
  return { uri: await writePhoneAutoBackup(json), inFolder: false }
}

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

export function shouldRunAutoBackupNow(prefs: AutoBackupPrefs, now = new Date()): boolean {
  if (!prefs.enabled) return false
  const today = toLocalDateKey(now)
  if (prefs.lastRunDate === today) return false
  const scheduled = prefs.hour * 60 + prefs.minute
  return minutesSinceMidnight(now) >= scheduled
}

export async function runAutoBackupJob(): Promise<boolean> {
  const pb = usePlaybookStore.getState()
  if (!pb.isOnboarded) return false
  if (!shouldRunAutoBackupNow(pb.autoBackup)) return false
  await writeAutoBackupFile()
  await pb.updatePlaybook({
    autoBackup: { ...pb.autoBackup, lastRunDate: toLocalDateKey(new Date()) },
  })
  return true
}

export async function runAutoBackupNow(): Promise<AutoBackupResult> {
  const result = await writeAutoBackupFile()
  const pb = usePlaybookStore.getState()
  await pb.updatePlaybook({
    autoBackup: { ...pb.autoBackup, lastRunDate: toLocalDateKey(new Date()) },
  })
  return result
}
