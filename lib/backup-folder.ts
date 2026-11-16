import { Platform } from 'react-native'
import {
  StorageAccessFramework as SAF,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy'

// A folder the user can see in My Files: <picked folder>/UnSpoil/{Auto,Exports}.
// Android keeps the folder permission across restarts, so the nightly
// background job can write there too. The picked folder is device-specific,
// so it lives in a file here, not in the database a backup import replaces.
const ROOT_NAME = 'UnSpoil'
export const AUTO_SUBFOLDER = 'Auto'
export const EXPORTS_SUBFOLDER = 'Exports'
const PREFS_FILE = `${documentDirectory}backup-folder.json`

export type BackupFolder = {
  /** Folder the user picked (e.g. Download). */
  treeUri: string
  autoUri: string
  exportsUri: string
}

export function isBackupFolderSupported(): boolean {
  return Platform.OS === 'android'
}

export async function getBackupFolder(): Promise<BackupFolder | null> {
  try {
    const info = await getInfoAsync(PREFS_FILE)
    if (!info.exists) return null
    const parsed = JSON.parse(await readAsStringAsync(PREFS_FILE)) as Partial<BackupFolder>
    if (!parsed.treeUri || !parsed.autoUri || !parsed.exportsUri) return null
    return parsed as BackupFolder
  } catch {
    return null
  }
}

/** Last path segment of a SAF uri, e.g. ".../primary%3ADownload%2FUnSpoil" → "UnSpoil". */
function safName(uri: string): string {
  const decoded = decodeURIComponent(uri)
  return decoded.slice(decoded.lastIndexOf('/') + 1).split(':').pop() ?? ''
}

/** Readable path for Settings, e.g. "Download/UnSpoil", taken from where Auto really is. */
export function backupFolderLabel(folder: BackupFolder): string {
  const decoded = decodeURIComponent(folder.autoUri)
  const path = decoded.slice(decoded.lastIndexOf(':') + 1).replace(/\/[^/]*$/, '')
  return path || ROOT_NAME
}

function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

async function findOrMakeDir(parentUri: string, name: string): Promise<string> {
  const children = await SAF.readDirectoryAsync(parentUri)
  const existing = children.find(uri => sameName(safName(uri), name))
  return existing ?? (await SAF.makeDirectoryAsync(parentUri, name))
}

/** Ask the user for a folder (Download suggested) and set up UnSpoil/Auto and UnSpoil/Exports. */
export async function chooseBackupFolder(): Promise<BackupFolder | null> {
  if (!isBackupFolderSupported()) return null
  const hint = SAF.getUriForDirectoryInRoot('Download')
  const perm = await SAF.requestDirectoryPermissionsAsync(hint)
  if (!perm.granted) return null
  // Picking the UnSpoil folder itself should not nest another UnSpoil inside it.
  const rootUri =
    sameName(safName(perm.directoryUri), ROOT_NAME)
      ? perm.directoryUri
      : await findOrMakeDir(perm.directoryUri, ROOT_NAME)
  const folder: BackupFolder = {
    treeUri: perm.directoryUri,
    autoUri: await findOrMakeDir(rootUri, AUTO_SUBFOLDER),
    exportsUri: await findOrMakeDir(rootUri, EXPORTS_SUBFOLDER),
  }
  await writeAsStringAsync(PREFS_FILE, JSON.stringify(folder))
  return folder
}

export type FolderBackupFile = { name: string; uri: string }

export async function listFolderBackups(dirUri: string): Promise<FolderBackupFile[]> {
  const children = await SAF.readDirectoryAsync(dirUri)
  return children
    .map(uri => ({ uri, name: safName(uri) }))
    .filter(f => f.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name))
}

export async function writeFolderBackup(
  dirUri: string,
  filename: string,
  json: string,
): Promise<string> {
  const uri = await SAF.createFileAsync(dirUri, filename.replace(/\.json$/i, ''), 'application/json')
  await SAF.writeAsStringAsync(uri, json)
  return uri
}

/** Sortable stamp shared by auto and export file names: 2026-11-16-2100. */
export function backupStamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}
