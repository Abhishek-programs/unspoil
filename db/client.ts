import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { migrations } from './migrations'

const sqlite = openDatabaseSync('spendsense.db', { enableChangeListener: true })
export const db = drizzle(sqlite, { schema })

const APP_TABLES = ['buckets', 'goals', 'keyword_mappings', 'net_worth_snapshots', 'playbook', 'sure_shot_merchants', 'transactions']

export async function runMigrations() {
  // Check if app tables exist but the migration was never recorded.
  // This happens when tables were created outside Drizzle's migrator.
  const appTableExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`
  )
  let migrationRecorded = false
  try {
    const row = sqlite.getFirstSync(`SELECT hash FROM __drizzle_migrations LIMIT 1`)
    migrationRecorded = !!row
  } catch {
    // __drizzle_migrations table doesn't exist yet — that's fine
  }

  if (appTableExists && !migrationRecorded) {
    // Dirty state: tables exist but migrator doesn't know. Nuke and redo.
    for (const table of [...APP_TABLES, '__drizzle_migrations']) {
      sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
    }
  }

  await migrate(db, migrations)
}
