/**
 * Load spendsense.db (from adb) and run verify-pulse-backup logic.
 * Usage: node scripts/verify-pulse-from-db.mjs /path/to/spendsense.db
 */
import { execSync } from 'child_process'
import { computePulseFromPayload } from './verify-pulse-backup.mjs'

function q(db, sql) {
  const out = execSync(`sqlite3 -json ${JSON.stringify(db)} ${JSON.stringify(sql)}`, {
    encoding: 'utf8',
  }).trim()
  if (!out) return []
  return JSON.parse(out)
}

function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function mapRow(row) {
  const o = {}
  for (const [k, v] of Object.entries(row)) {
    o[snakeToCamel(k)] = v
  }
  if (typeof o.isActive === 'number') o.isActive = !!o.isActive
  if (typeof o.showOnHome === 'number') o.showOnHome = !!o.showOnHome
  if (typeof o.accumulates === 'number') o.accumulates = !!o.accumulates
  if (typeof o.isFlagged === 'number') o.isFlagged = !!o.isFlagged
  if (typeof o.isRecurringDraft === 'number') o.isRecurringDraft = !!o.isRecurringDraft
  if (typeof o.isOnboarded === 'number') o.isOnboarded = !!o.isOnboarded
  return o
}

const dbPath = process.argv[2]
if (!dbPath) {
  console.error('Usage: node scripts/verify-pulse-from-db.mjs spendsense.db')
  process.exit(1)
}

const payload = {
  exportedAt: new Date().toISOString(),
  tables: {
    playbook: q(dbPath, 'SELECT * FROM playbook').map(mapRow),
    buckets: q(dbPath, 'SELECT * FROM buckets').map(mapRow),
    transactions: q(dbPath, 'SELECT * FROM transactions').map(mapRow),
    accounts: q(dbPath, 'SELECT * FROM accounts').map(mapRow),
    accountAdjustments: q(dbPath, 'SELECT * FROM account_adjustments').map(mapRow),
    lendBorrowEntries: q(dbPath, 'SELECT * FROM lend_borrow_entries').map(mapRow),
  },
}

console.log('Live DB playbook:', payload.tables.playbook[0])
console.log('\n=== Pulse (today) ===')
console.log(JSON.stringify(computePulseFromPayload(payload, new Date()), null, 2))
