import { listAutoBackupFiles } from '@/lib/auto-backup'
import { getBackupFolder, listFolderBackups } from '@/lib/backup-folder'

export type BackupSource = 'auto' | 'export' | 'phone'

export type BackupEntry = {
  source: BackupSource
  name: string
  uri: string
  /** Parsed from the file name; null for files named some other way. */
  date: Date | null
}

const SOURCE_ORDER: Record<BackupSource, number> = { auto: 0, export: 1, phone: 2 }

function dateFromName(name: string): Date | null {
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})(?:-(\d{2})(\d{2}))?/)
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0'] = m
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi))
}

/** Every backup the app can find: UnSpoil/Auto, UnSpoil/Exports and app storage, newest first. */
export async function listAllBackups(): Promise<BackupEntry[]> {
  const entries: BackupEntry[] = []
  const folder = await getBackupFolder()
  if (folder) {
    const [auto, exports] = await Promise.all([
      listFolderBackups(folder.autoUri).catch(() => []),
      listFolderBackups(folder.exportsUri).catch(() => []),
    ])
    for (const f of auto) entries.push({ source: 'auto', ...f, date: dateFromName(f.name) })
    for (const f of exports) entries.push({ source: 'export', ...f, date: dateFromName(f.name) })
  }
  for (const f of await listAutoBackupFiles().catch(() => [])) {
    entries.push({
      source: 'phone',
      name: f.name,
      uri: f.uri,
      date: dateFromName(f.name) ?? (f.modificationTime ? new Date(f.modificationTime * 1000) : null),
    })
  }
  return entries.sort(
    (a, b) =>
      (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0) ||
      SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source],
  )
}
