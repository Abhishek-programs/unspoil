import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { StorageAccessFramework } from 'expo-file-system/legacy'
import { db, applySchemaPatches, sqlite, USER_DATA_TABLES } from '@/db/client'
import {
  accountAdjustments,
  accountTransfers,
  accounts,
  bucketBalances,
  buckets,
  contacts,
  goals,
  keywordMappings,
  lendBorrowEntries,
  netWorthSnapshots,
  playbook,
  sureShotMerchants,
  transactions,
} from '@/db/schema'
import { getMonthRange } from '@/lib/month'
import { setActiveCurrency } from '@/lib/format'
import {
  getPaymentWatchBackupState,
  restorePaymentWatchBackupState,
  type PaymentWatchBackupState,
} from '@/lib/payment-watch'
import { usePlaybookStore, type NudgeToggles } from '@/store/playbook'
import { useBucketsStore } from '@/store/buckets'
import { useTransactionsStore } from '@/store/transactions'
import { useGoalsStore } from '@/store/goals'
import { useLendingStore } from '@/store/lending'
import { useAccountsStore } from '@/store/accounts'

export const BACKUP_FORMAT = 'unspoil-backup'
export const BACKUP_VERSION = 2

const TABLE_KEYS = {
  playbook: 'playbook',
  buckets: 'buckets',
  bucket_balances: 'bucketBalances',
  keyword_mappings: 'keywordMappings',
  sure_shot_merchants: 'sureShotMerchants',
  accounts: 'accounts',
  goals: 'goals',
  contacts: 'contacts',
  transactions: 'transactions',
  account_transfers: 'accountTransfers',
  account_adjustments: 'accountAdjustments',
  lend_borrow_entries: 'lendBorrowEntries',
  net_worth_snapshots: 'netWorthSnapshots',
} as const satisfies Record<(typeof USER_DATA_TABLES)[number], string>

type TableKey = (typeof TABLE_KEYS)[keyof typeof TABLE_KEYS]

const BOOLEAN_FIELDS: Partial<Record<TableKey, string[]>> = {
  playbook: ['isOnboarded'],
  buckets: ['isActive', 'showOnHome', 'accumulates'],
  transactions: ['isFlagged', 'isRecurringDraft'],
  goals: ['isEnabled'],
  accounts: ['isSystem'],
}

export type BackupPreferences = {
  nudgeToggles: NudgeToggles
  lastNotificationDate: string | null
}

export type BackupPayload = {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  appVersion: string | null
  /** Human-readable checklist of what is in the file. */
  includes: string[]
  tableCounts: Record<string, number>
  tables: Record<TableKey, Record<string, unknown>[]>
  preferences?: BackupPreferences
  paymentHelper?: PaymentWatchBackupState | null
}

export function backupFilename(now = new Date()): string {
  const day = now.toISOString().slice(0, 10)
  return `unspoil-backup-${day}.json`
}

/** Android: pick a folder (Downloads suggested) and write the backup file there. */
export async function saveBackupToDevice(json: string, filename: string): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('Save to device is only supported on Android.')
  }
  const baseName = filename.replace(/\.json$/i, '')
  const downloadsHint = StorageAccessFramework.getUriForDirectoryInRoot('Download')
  const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsHint)
  if (!perm.granted) {
    throw new Error('CANCELLED')
  }
  const fileUri = await StorageAccessFramework.createFileAsync(
    perm.directoryUri,
    baseName,
    'application/json',
  )
  await StorageAccessFramework.writeAsStringAsync(fileUri, json)
}

function snakeToCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function rowToCamel(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v
  }
  return out
}

function normalizeBooleans(tableKey: TableKey, row: Record<string, unknown>) {
  const fields = BOOLEAN_FIELDS[tableKey]
  if (!fields) return
  for (const field of fields) {
    const v = row[field]
    if (v === 1 || v === '1') row[field] = true
    if (v === 0 || v === '0') row[field] = false
  }
}

function normalizeImportedRows(tableKey: TableKey, rows: Record<string, unknown>[]) {
  return rows.map(raw => {
    const hasSnake = Object.keys(raw).some(k => k.includes('_'))
    const row = hasSnake ? rowToCamel(raw) : { ...raw }
    normalizeBooleans(tableKey, row)
    return row
  })
}

function exportTableRaw(sqlName: (typeof USER_DATA_TABLES)[number]): Record<string, unknown>[] {
  const rows = sqlite.getAllSync(`SELECT * FROM "${sqlName}"`) as Record<string, unknown>[]
  const tableKey = TABLE_KEYS[sqlName] as TableKey
  return rows.map(r => {
    const row = rowToCamel(r)
    normalizeBooleans(tableKey, row)
    return row
  })
}

export async function exportBackup(): Promise<string> {
  applySchemaPatches()
  const tables = {} as BackupPayload['tables']
  const tableCounts: Record<string, number> = {}

  for (const sqlName of USER_DATA_TABLES) {
    const key = TABLE_KEYS[sqlName] as TableKey
    const rows = exportTableRaw(sqlName)
    tables[key] = rows
    tableCounts[key] = rows.length
  }

  const pb = usePlaybookStore.getState()
  const paymentHelper = await getPaymentWatchBackupState()

  const includes = [
    'Profile & playbook (name, currency, income, month start, age, onboarding done)',
    'Month state (carry-forward, early month, checklist & rollover markers, Personal recovery)',
    'All buckets (amounts, caps, icons, goal links, inactive buckets)',
    'Bucket fund balances (Personal, EF, etc.)',
    'Goals (targets, SIP/shares starting balances from onboarding)',
    'Money accounts (Bank, eSewa, Cash balances)',
    'Account transfers & found-money adjustments',
    'Every transaction (manual, payment helper, fees, flags)',
    'Lending contacts & ledger',
    'Keyword & sure-shot mappings (if any)',
    'Net worth snapshots',
    'Notification nudge toggles',
    'Payment helper (enabled, delay, watched apps)',
  ]

  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? null,
    includes,
    tableCounts,
    tables,
    preferences: {
      nudgeToggles: pb.nudgeToggles,
      lastNotificationDate: pb.lastNotificationDate,
    },
    paymentHelper,
  }

  return JSON.stringify(payload, null, 2)
}

function parseBackup(raw: string): BackupPayload {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('File is not valid JSON.')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Backup file is empty or invalid.')
  }
  const body = parsed as Partial<BackupPayload>
  if (body.format !== BACKUP_FORMAT) {
    throw new Error('This file is not an UnSpoil backup.')
  }
  if (body.version !== 1 && body.version !== 2) {
    throw new Error(`Unsupported backup version (${body.version ?? '?'}). Update the app and try again.`)
  }
  if (!body.tables || typeof body.tables !== 'object') {
    throw new Error('Backup is missing table data.')
  }
  const requiredKeys = Object.values(TABLE_KEYS)
  for (const key of requiredKeys) {
    const rows = (body.tables as Record<string, unknown>)[key]
    if (!Array.isArray(rows)) {
      throw new Error(`Backup is missing "${key}" data.`)
    }
  }
  const playbookRows = (body.tables as BackupPayload['tables']).playbook
  if (playbookRows.length === 0) {
    throw new Error('Backup has no playbook row.')
  }
  return body as BackupPayload
}

function patchPlaybook(rows: Record<string, unknown>[]) {
  for (const row of rows) {
    if (!row.currency || typeof row.currency !== 'string') row.currency = 'NPR'
  }
}

async function wipeUserData() {
  await db.delete(transactions)
  await db.delete(accountTransfers)
  await db.delete(accountAdjustments)
  await db.delete(accounts)
  await db.delete(lendBorrowEntries)
  await db.delete(contacts)
  await db.delete(goals)
  await db.delete(bucketBalances)
  await db.delete(netWorthSnapshots)
  await db.delete(keywordMappings)
  await db.delete(sureShotMerchants)
  await db.delete(buckets)
  await db.delete(playbook)
}

async function insertBackupTables(t: BackupPayload['tables']) {
  const playbookRows = normalizeImportedRows('playbook', t.playbook)
  patchPlaybook(playbookRows)
  await db.insert(playbook).values(playbookRows as typeof playbook.$inferInsert[])

  const bucketRows = normalizeImportedRows('buckets', t.buckets)
  if (bucketRows.length > 0) {
    await db.insert(buckets).values(bucketRows as typeof buckets.$inferInsert[])
  }
  const balanceRows = normalizeImportedRows('bucketBalances', t.bucketBalances)
  if (balanceRows.length > 0) {
    await db.insert(bucketBalances).values(balanceRows as typeof bucketBalances.$inferInsert[])
  }
  const keywordRows = normalizeImportedRows('keywordMappings', t.keywordMappings)
  if (keywordRows.length > 0) {
    await db.insert(keywordMappings).values(keywordRows as typeof keywordMappings.$inferInsert[])
  }
  const sureRows = normalizeImportedRows('sureShotMerchants', t.sureShotMerchants)
  if (sureRows.length > 0) {
    await db.insert(sureShotMerchants).values(sureRows as typeof sureShotMerchants.$inferInsert[])
  }
  const accountRows = normalizeImportedRows('accounts', t.accounts)
  if (accountRows.length > 0) {
    await db.insert(accounts).values(accountRows as typeof accounts.$inferInsert[])
  }
  const goalRows = normalizeImportedRows('goals', t.goals)
  if (goalRows.length > 0) {
    await db.insert(goals).values(goalRows as typeof goals.$inferInsert[])
  }
  const contactRows = normalizeImportedRows('contacts', t.contacts)
  if (contactRows.length > 0) {
    await db.insert(contacts).values(contactRows as typeof contacts.$inferInsert[])
  }
  const txnRows = normalizeImportedRows('transactions', t.transactions)
  if (txnRows.length > 0) {
    await db.insert(transactions).values(txnRows as typeof transactions.$inferInsert[])
  }
  const transferRows = normalizeImportedRows('accountTransfers', t.accountTransfers)
  if (transferRows.length > 0) {
    await db.insert(accountTransfers).values(transferRows as typeof accountTransfers.$inferInsert[])
  }
  const adjustmentRows = normalizeImportedRows('accountAdjustments', t.accountAdjustments)
  if (adjustmentRows.length > 0) {
    await db.insert(accountAdjustments).values(adjustmentRows as typeof accountAdjustments.$inferInsert[])
  }
  const lendingRows = normalizeImportedRows('lendBorrowEntries', t.lendBorrowEntries)
  if (lendingRows.length > 0) {
    await db.insert(lendBorrowEntries).values(lendingRows as typeof lendBorrowEntries.$inferInsert[])
  }
  const snapshotRows = normalizeImportedRows('netWorthSnapshots', t.netWorthSnapshots)
  if (snapshotRows.length > 0) {
    await db.insert(netWorthSnapshots).values(snapshotRows as typeof netWorthSnapshots.$inferInsert[])
  }
}

async function restorePreferences(prefs?: BackupPreferences) {
  if (!prefs) return
  usePlaybookStore.setState({
    nudgeToggles: prefs.nudgeToggles,
    lastNotificationDate: prefs.lastNotificationDate,
  })
}

export async function importBackup(raw: string): Promise<{
  txnCount: number
  exportedAt: string
  userName: string | null
}> {
  const payload = parseBackup(raw)
  applySchemaPatches()
  await wipeUserData()
  await insertBackupTables(payload.tables)
  await restorePreferences(payload.preferences)
  if (payload.paymentHelper) {
    await restorePaymentWatchBackupState(payload.paymentHelper)
  }
  await hydrateStoresAfterDbChange()
  const name = payload.tables.playbook[0]?.userName
  return {
    txnCount: payload.tables.transactions.length,
    exportedAt: payload.exportedAt,
    userName: typeof name === 'string' ? name : null,
  }
}

export async function hydrateStoresAfterDbChange() {
  await usePlaybookStore.getState().loadPlaybook()
  const pb = usePlaybookStore.getState()
  setActiveCurrency(pb.currency)
  const { start, end } = getMonthRange(pb.monthStartDay, pb.earlyMonthStartDate)
  await useBucketsStore.getState().loadBuckets()
  await useTransactionsStore.getState().loadAllTransactions()
  await useTransactionsStore.getState().loadTransactions(start, end)
  await useGoalsStore.getState().loadGoals()
  await useLendingStore.getState().loadContacts()
  await useLendingStore.getState().loadAllEntries()
  await useLendingStore.getState().loadEntries(start, end)
  await useAccountsStore.getState().loadAccounts()
}

export function backupSummary(raw: string): {
  exportedAt: string
  txnCount: number
  userName: string | null
  bucketCount: number
  isOnboarded: boolean
} {
  const payload = parseBackup(raw)
  const pb = payload.tables.playbook[0]
  return {
    exportedAt: payload.exportedAt,
    txnCount: payload.tables.transactions.length,
    userName: typeof pb?.userName === 'string' ? pb.userName : null,
    bucketCount: payload.tables.buckets.length,
    isOnboarded: pb?.isOnboarded === true || pb?.isOnboarded === 1,
  }
}
