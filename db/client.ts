import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { migrations } from './migrations'

const sqlite = openDatabaseSync('spendsense.db', { enableChangeListener: true })
export const db = drizzle(sqlite, { schema })

const APP_TABLES = ['bucket_balances', 'buckets', 'contacts', 'goals', 'keyword_mappings', 'lend_borrow_entries', 'net_worth_snapshots', 'playbook', 'sure_shot_merchants', 'transactions']

type TableInfoRow = { name: string }

function hasColumn(table: string, column: string): boolean {
  const cols = sqlite.getAllSync(`PRAGMA table_info("${table}")`) as TableInfoRow[]
  return cols.some(c => c.name === column)
}

/** Idempotent fixes for installs that missed a migration (e.g. m0004 ef_start_balance). */
export function applySchemaPatches() {
  const playbookExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  if (playbookExists && !hasColumn('playbook', 'ef_start_balance')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`ef_start_balance\` real DEFAULT 0 NOT NULL`)
  }

  const bucketsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`
  )
  if (bucketsExists) {
    const foodBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'food' OR name = 'Food' LIMIT 1`
    )
    if (foodBucket) {
      sqlite.execSync(`DELETE FROM keyword_mappings WHERE keyword = 'food'`)
      sqlite.execSync(`DELETE FROM buckets WHERE id = '${foodBucket.id}'`)
    }

    if (!hasColumn('buckets', 'linked_goal_id')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`linked_goal_id\` text`)
    }
    if (!hasColumn('buckets', 'goal_bucket_role')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`goal_bucket_role\` text`)
    }
    if (!hasColumn('buckets', 'accumulates')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`accumulates\` integer DEFAULT false NOT NULL`)
    }
    if (!hasColumn('buckets', 'accumulation_cap')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`accumulation_cap\` real`)
    }
    if (!hasColumn('buckets', 'cap_override')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`cap_override\` real`)
    }
    if (!hasColumn('buckets', 'cap_override_reason')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`cap_override_reason\` text`)
    }
    if (!hasColumn('buckets', 'cap_override_purchase_amount')) {
      sqlite.execSync(`ALTER TABLE \`buckets\` ADD COLUMN \`cap_override_purchase_amount\` real`)
    }
    sqlite.execSync(`UPDATE \`buckets\` SET \`is_active\` = 0, \`show_on_home\` = 0 WHERE \`id\` = 'food' OR \`name\` = 'Food'`)
    sqlite.execSync(`DELETE FROM keyword_mappings WHERE keyword = 'food'`)
    sqlite.execSync(`DELETE FROM buckets WHERE id = 'food' OR name = 'Food'`)

    const personalBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'personal' OR name = 'Personal' LIMIT 1`
    )
    if (!personalBucket) {
      sqlite.execSync(
        `INSERT INTO \`buckets\` (\`id\`, \`name\`, \`type\`, \`monthly_amount\`, \`color\`, \`icon\`, \`sort_order\`, \`is_active\`, \`show_on_home\`, \`accumulates\`, \`accumulation_cap\`)
         VALUES ('personal', 'Personal', 'spending', 5000, '#7C3AED', '👤', 4, 1, 1, 1, 20000)`
      )
    }

    const personalId = personalBucket?.id ?? 'personal'
    const personalKeyword = sqlite.getFirstSync(
      `SELECT id FROM keyword_mappings WHERE keyword = 'personal' LIMIT 1`
    )
    if (!personalKeyword) {
      sqlite.execSync(
        `INSERT INTO \`keyword_mappings\` (\`keyword\`, \`bucket_id\`) VALUES ('personal', '${personalId}')`
      )
    }
  }

  const playbookTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  if (playbookTable && !hasColumn('playbook', 'last_balance_rollover_month')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`last_balance_rollover_month\` text`)
  }
  if (playbookTable && !hasColumn('playbook', 'user_age')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`user_age\` integer`)
  }
  if (playbookTable && !hasColumn('playbook', 'carried_forward_balance')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`carried_forward_balance\` real DEFAULT 0`)
  }
  if (playbookTable && !hasColumn('playbook', 'last_surplus_rollover_month')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`last_surplus_rollover_month\` text`)
  }
  if (playbookTable && !hasColumn('playbook', 'last_personal_rebalance_prompt_month')) {
    sqlite.execSync(`ALTER TABLE \`playbook\` ADD COLUMN \`last_personal_rebalance_prompt_month\` text`)
  }

  const balancesTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='bucket_balances'`
  )
  if (!balancesTable) {
    sqlite.execSync(
      `CREATE TABLE \`bucket_balances\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`bucket_id\` text NOT NULL,
        \`balance\` real DEFAULT 0 NOT NULL,
        \`updated_at\` text NOT NULL
      )`
    )
  }

  const goalsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='goals'`
  )
  if (goalsExists) {
    if (!hasColumn('goals', 'payment_mode')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`payment_mode\` text DEFAULT 'pay_in_full' NOT NULL`)
    }
    if (!hasColumn('goals', 'upfront_amount')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`upfront_amount\` real`)
    }
    if (!hasColumn('goals', 'emi_tenure_months')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`emi_tenure_months\` integer`)
    }
    if (!hasColumn('goals', 'is_enabled')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`is_enabled\` integer DEFAULT true NOT NULL`)
    }
    if (!hasColumn('goals', 'completed_at')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`completed_at\` text`)
    }
    if (!hasColumn('goals', 'freed_monthly_amount')) {
      sqlite.execSync(`ALTER TABLE \`goals\` ADD COLUMN \`freed_monthly_amount\` real`)
    }
  }

  const transactionsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'`
  )
  if (transactionsExists && !hasColumn('transactions', 'description')) {
    sqlite.execSync(`ALTER TABLE \`transactions\` ADD COLUMN \`description\` text`)
    sqlite.execSync(
      `UPDATE \`transactions\` SET \`description\` = \`remarks\`
       WHERE \`description\` IS NULL
         AND \`remarks\` IS NOT NULL
         AND \`remarks\` NOT LIKE '__%'`,
    )
  }
  if (transactionsExists && !hasColumn('transactions', 'funded_from_bucket_id')) {
    sqlite.execSync(`ALTER TABLE \`transactions\` ADD COLUMN \`funded_from_bucket_id\` text`)
  }

  const contactsTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'`,
  )
  if (!contactsTable) {
    sqlite.execSync(
      `CREATE TABLE \`contacts\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`created_at\` text NOT NULL
      )`,
    )
    sqlite.execSync(
      `CREATE UNIQUE INDEX IF NOT EXISTS \`contacts_name_unique\` ON \`contacts\` (lower(trim(\`name\`)))`,
    )
  }

  const lendTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='lend_borrow_entries'`,
  )
  if (!lendTable) {
    sqlite.execSync(
      `CREATE TABLE \`lend_borrow_entries\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`contact_id\` text NOT NULL,
        \`type\` text NOT NULL,
        \`amount\` real NOT NULL,
        \`note\` text,
        \`date\` text NOT NULL,
        \`created_at\` text NOT NULL
      )`,
    )
  }
}

let migrationsPromise: Promise<void> | null = null

function countRecordedMigrations(): number {
  try {
    const rows = sqlite.getAllSync(`SELECT hash FROM __drizzle_migrations`) as { hash: string }[]
    return rows.length
  } catch {
    return 0
  }
}

export async function runMigrations() {
  // Fast Refresh / Strict Mode can remount root layout; share one in-flight run.
  if (migrationsPromise) return migrationsPromise

  migrationsPromise = (async () => {
    const appTableExists = sqlite.getFirstSync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`,
    )
    const beforeCount = countRecordedMigrations()

    if (appTableExists && beforeCount === 0) {
      // Dirty state: tables exist but migrator doesn't know. Nuke and redo.
      console.warn('DB dirty state (tables without migration journal) — resetting schema')
      for (const table of [...APP_TABLES, '__drizzle_migrations']) {
        sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
      }
    }

    try {
      await migrate(db, migrations)
      applySchemaPatches()
      const afterCount = countRecordedMigrations()
      if (afterCount > beforeCount) {
        console.log(`DB migrations applied (${beforeCount} → ${afterCount})`)
      }
    } catch (error) {
      console.error('Migration failed, attempting hard reset:', error)
      for (const table of [...APP_TABLES, '__drizzle_migrations']) {
        sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
      }
      await migrate(db, migrations)
      applySchemaPatches()
      console.log('DB recovered after hard reset')
    }
  })()

  try {
    await migrationsPromise
  } catch (error) {
    migrationsPromise = null
    throw error
  }
}
