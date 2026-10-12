import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'
import { migrate } from 'drizzle-orm/expo-sqlite/migrator'
import * as schema from './schema'
import { migrations } from './migrations'
import {
  CORE_LIVING_BUCKET_ID,
  DATES_BUCKET_ID,
  DEFAULT_BUCKETS,
  EF_MULTIPLIER,
  FUN_BUCKET_ID,
  GOAL_POOL_BUCKET_ID,
  MISC_BUCKET_ID,
} from '@/constants/defaults'

const sqlite = openDatabaseSync('spendsense.db', { enableChangeListener: true })
export { sqlite }
export const db = drizzle(sqlite, { schema })

export const USER_DATA_TABLES = [
  'playbook',
  'buckets',
  'bucket_balances',
  'keyword_mappings',
  'sure_shot_merchants',
  'accounts',
  'goals',
  'contacts',
  'transactions',
  'account_transfers',
  'account_adjustments',
  'lend_borrow_entries',
  'net_worth_snapshots',
] as const

const APP_TABLES = [...USER_DATA_TABLES]

type TableInfoRow = { name: string }

function hasColumn(table: string, column: string): boolean {
  try {
    const cols = sqlite.getAllSync(`PRAGMA table_info(${table})`) as Array<
      TableInfoRow | Record<string, unknown>
    >
    return cols.some(c => {
      if (c && typeof c === 'object' && 'name' in c) {
        return String((c as TableInfoRow).name) === column
      }
      // Some drivers return PRAGMA rows as arrays: [cid, name, type, ...]
      if (Array.isArray(c)) return String(c[1]) === column
      return false
    })
  } catch {
    return false
  }
}

function tryExec(sql: string) {
  try {
    sqlite.execSync(sql)
  } catch (error) {
    console.warn('Schema patch skipped:', sql.slice(0, 80), error)
  }
}

function ensureColumn(table: string, column: string, alterSql: string) {
  if (!hasColumn(table, column)) {
    tryExec(alterSql)
  }
}

function livingFallbackAmount(id: string, efFloor?: number | null): number | null {
  if (id === CORE_LIVING_BUCKET_ID && efFloor && efFloor > 0) {
    return Math.round(efFloor / EF_MULTIPLIER)
  }
  const preset = DEFAULT_BUCKETS.find(b => b.id === id)
  return preset && preset.monthlyAmount > 0 ? preset.monthlyAmount : null
}

/** Re-apply a wiped spending ceiling from the last good amount, then playbook defaults. */
export function restoreWipedSpendingCeilings() {
  const bucketsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`,
  )
  if (!bucketsExists) return

  ensureColumn(
    'buckets',
    'last_monthly_amount',
    `ALTER TABLE \`buckets\` ADD COLUMN \`last_monthly_amount\` real`,
  )

  tryExec(
    `UPDATE \`buckets\` SET \`last_monthly_amount\` = \`monthly_amount\`
     WHERE \`monthly_amount\` > 0
       AND (\`last_monthly_amount\` IS NULL OR \`last_monthly_amount\` <= 0)`,
  )
  tryExec(
    `UPDATE \`buckets\` SET \`monthly_amount\` = \`last_monthly_amount\`
     WHERE \`monthly_amount\` = 0
       AND \`last_monthly_amount\` > 0
       AND \`id\` != '${GOAL_POOL_BUCKET_ID}'`,
  )

  const pb = sqlite.getFirstSync<{ ef_floor?: number }>(
    `SELECT ef_floor FROM playbook LIMIT 1`,
  )
  const efFloor = Number(pb?.ef_floor) || 0
  const fallbacks = [
    CORE_LIVING_BUCKET_ID,
    DATES_BUCKET_ID,
    FUN_BUCKET_ID,
    MISC_BUCKET_ID,
  ]
  for (const id of fallbacks) {
    const amount = livingFallbackAmount(id, efFloor)
    if (!amount) continue
    tryExec(
      `UPDATE \`buckets\` SET \`monthly_amount\` = ${amount}, \`last_monthly_amount\` = ${amount}
       WHERE (\`id\` = '${id}') AND \`monthly_amount\` = 0`,
    )
  }
}

/** Idempotent fixes for installs that missed a migration (e.g. m0004 ef_start_balance). */
export function applySchemaPatches() {
  const playbookExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  // Apply early-month column first — Paid early writes it before other patches matter.
  if (playbookExists) {
    ensureColumn(
      'playbook',
      'early_month_start_date',
      `ALTER TABLE \`playbook\` ADD COLUMN \`early_month_start_date\` text`,
    )
  }
  if (playbookExists && !hasColumn('playbook', 'ef_start_balance')) {
    tryExec(`ALTER TABLE \`playbook\` ADD COLUMN \`ef_start_balance\` real DEFAULT 0 NOT NULL`)
  }

  const bucketsExists = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`
  )
  if (bucketsExists) {
    const foodBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'food' OR name = 'Food' LIMIT 1`
    )
    if (foodBucket) {
      tryExec(`DELETE FROM keyword_mappings WHERE keyword = 'food'`)
      tryExec(`DELETE FROM buckets WHERE id = '${foodBucket.id}'`)
    }

    ensureColumn('buckets', 'linked_goal_id', `ALTER TABLE \`buckets\` ADD COLUMN \`linked_goal_id\` text`)
    ensureColumn('buckets', 'goal_bucket_role', `ALTER TABLE \`buckets\` ADD COLUMN \`goal_bucket_role\` text`)
    ensureColumn(
      'buckets',
      'accumulates',
      `ALTER TABLE \`buckets\` ADD COLUMN \`accumulates\` integer DEFAULT 0 NOT NULL`,
    )
    ensureColumn('buckets', 'accumulation_cap', `ALTER TABLE \`buckets\` ADD COLUMN \`accumulation_cap\` real`)
    ensureColumn('buckets', 'cap_override', `ALTER TABLE \`buckets\` ADD COLUMN \`cap_override\` real`)
    ensureColumn(
      'buckets',
      'cap_override_reason',
      `ALTER TABLE \`buckets\` ADD COLUMN \`cap_override_reason\` text`,
    )
    ensureColumn(
      'buckets',
      'cap_override_purchase_amount',
      `ALTER TABLE \`buckets\` ADD COLUMN \`cap_override_purchase_amount\` real`,
    )
    tryExec(`UPDATE \`buckets\` SET \`is_active\` = 0, \`show_on_home\` = 0 WHERE \`id\` = 'food' OR \`name\` = 'Food'`)
    tryExec(`DELETE FROM keyword_mappings WHERE keyword = 'food'`)
    tryExec(`DELETE FROM buckets WHERE id = 'food' OR name = 'Food'`)

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

    const miscBucket = sqlite.getFirstSync<{ id: string }>(
      `SELECT id FROM buckets WHERE id = 'misc' OR name = 'Misc' LIMIT 1`
    )
    if (!miscBucket) {
      sqlite.execSync(
        `INSERT OR IGNORE INTO \`buckets\` (\`id\`, \`name\`, \`type\`, \`monthly_amount\`, \`color\`, \`icon\`, \`sort_order\`, \`is_active\`, \`show_on_home\`, \`accumulates\`)
         VALUES ('misc', 'Misc', 'spending', 3000, '#64748B', '📦', 4, 1, 1, 0)`
      )
    } else {
      // Keep Misc active so payment helper / Living always include it
      sqlite.execSync(
        `UPDATE \`buckets\` SET \`is_active\` = 1, \`type\` = 'spending' WHERE \`id\` = 'misc' OR \`name\` = 'Misc'`
      )
    }
    const miscId = miscBucket?.id ?? 'misc'
    const miscKeyword = sqlite.getFirstSync(
      `SELECT id FROM keyword_mappings WHERE keyword = 'misc' LIMIT 1`
    )
    if (!miscKeyword) {
      sqlite.execSync(
        `INSERT INTO \`keyword_mappings\` (\`keyword\`, \`bucket_id\`) VALUES ('misc', '${miscId}')`
      )
    }
    // Default catch-all: move fallback off Core Living onto Misc when still on the old default
    sqlite.execSync(
      `UPDATE \`playbook\` SET \`fallback_bucket_id\` = '${miscId}'
       WHERE \`fallback_bucket_id\` IS NULL OR \`fallback_bucket_id\` = 'core-living'`
    )
  }

  const playbookTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='playbook'`
  )
  if (playbookTable) {
    ensureColumn(
      'playbook',
      'last_balance_rollover_month',
      `ALTER TABLE \`playbook\` ADD COLUMN \`last_balance_rollover_month\` text`,
    )
    ensureColumn(
      'playbook',
      'early_month_start_date',
      `ALTER TABLE \`playbook\` ADD COLUMN \`early_month_start_date\` text`,
    )
    ensureColumn(
      'playbook',
      'last_checklist_prompt_month',
      `ALTER TABLE \`playbook\` ADD COLUMN \`last_checklist_prompt_month\` text`,
    )
    ensureColumn('playbook', 'user_age', `ALTER TABLE \`playbook\` ADD COLUMN \`user_age\` integer`)
    ensureColumn(
      'playbook',
      'currency',
      `ALTER TABLE \`playbook\` ADD COLUMN \`currency\` text DEFAULT 'NPR' NOT NULL`,
    )
    ensureColumn(
      'playbook',
      'carried_forward_balance',
      `ALTER TABLE \`playbook\` ADD COLUMN \`carried_forward_balance\` real DEFAULT 0`,
    )
    ensureColumn(
      'playbook',
      'last_surplus_rollover_month',
      `ALTER TABLE \`playbook\` ADD COLUMN \`last_surplus_rollover_month\` text`,
    )
    ensureColumn(
      'playbook',
      'last_personal_rebalance_prompt_month',
      `ALTER TABLE \`playbook\` ADD COLUMN \`last_personal_rebalance_prompt_month\` text`,
    )
    ensureColumn(
      'playbook',
      'personal_recovery_debt',
      `ALTER TABLE \`playbook\` ADD COLUMN \`personal_recovery_debt\` real DEFAULT 0`,
    )
    ensureColumn(
      'playbook',
      'personal_normal_top_up',
      `ALTER TABLE \`playbook\` ADD COLUMN \`personal_normal_top_up\` real`,
    )
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
  if (transactionsExists && !hasColumn('transactions', 'account_id')) {
    sqlite.execSync(`ALTER TABLE \`transactions\` ADD COLUMN \`account_id\` text`)
  }
  if (transactionsExists && !hasColumn('transactions', 'fee_amount')) {
    sqlite.execSync(`ALTER TABLE \`transactions\` ADD COLUMN \`fee_amount\` real DEFAULT 0 NOT NULL`)
  }
  if (transactionsExists && hasColumn('transactions', 'remarks')) {
    tryExec(`UPDATE \`transactions\` SET \`bucket_id\` = '_salary' WHERE \`remarks\` = '__salary__'`)
    tryExec(`ALTER TABLE \`transactions\` DROP COLUMN \`remarks\``)
  }

  const accountsTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='accounts'`,
  )
  if (!accountsTable) {
    sqlite.execSync(
      `CREATE TABLE \`accounts\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`name\` text NOT NULL,
        \`kind\` text NOT NULL,
        \`balance\` real DEFAULT 0 NOT NULL,
        \`sort_order\` integer DEFAULT 0 NOT NULL,
        \`is_system\` integer DEFAULT 1 NOT NULL
      )`,
    )
  }
  const bank = sqlite.getFirstSync(`SELECT id FROM accounts WHERE id = 'bank' LIMIT 1`)
  if (!bank) {
    sqlite.execSync(
      `INSERT INTO \`accounts\` (\`id\`, \`name\`, \`kind\`, \`balance\`, \`sort_order\`, \`is_system\`)
       VALUES ('bank', 'Bank', 'bank', 0, 0, 1)`,
    )
  }
  const esewa = sqlite.getFirstSync(`SELECT id FROM accounts WHERE id = 'esewa' LIMIT 1`)
  if (!esewa) {
    sqlite.execSync(
      `INSERT INTO \`accounts\` (\`id\`, \`name\`, \`kind\`, \`balance\`, \`sort_order\`, \`is_system\`)
       VALUES ('esewa', 'eSewa', 'esewa', 0, 1, 1)`,
    )
  }
  const cash = sqlite.getFirstSync(`SELECT id FROM accounts WHERE id = 'cash' LIMIT 1`)
  if (!cash) {
    sqlite.execSync(
      `INSERT INTO \`accounts\` (\`id\`, \`name\`, \`kind\`, \`balance\`, \`sort_order\`, \`is_system\`)
       VALUES ('cash', 'Cash', 'cash', 0, 2, 1)`,
    )
  }

  const transfersTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='account_transfers'`,
  )
  if (!transfersTable) {
    sqlite.execSync(
      `CREATE TABLE \`account_transfers\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`from_account_id\` text NOT NULL,
        \`to_account_id\` text NOT NULL,
        \`amount\` real NOT NULL,
        \`note\` text,
        \`date\` text NOT NULL,
        \`created_at\` text NOT NULL
      )`,
    )
  }

  const adjustmentsTable = sqlite.getFirstSync(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='account_adjustments'`,
  )
  if (!adjustmentsTable) {
    sqlite.execSync(
      `CREATE TABLE \`account_adjustments\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`account_id\` text NOT NULL,
        \`amount\` real NOT NULL,
        \`note\` text,
        \`date\` text NOT NULL,
        \`created_at\` text NOT NULL
      )`,
    )
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

  restoreWipedSpendingCeilings()

  // Leftover at Paid early was remembered as 120.47; nBank implies 120.31
  // (16 paisa). Carry was 120.47+450 Foil — nudge that leftover only.
  tryExec(
    `UPDATE \`playbook\` SET \`carried_forward_balance\` = 570.31
     WHERE \`early_month_start_date\` = '2026-09-16'
       AND \`last_surplus_rollover_month\` = '2026-09@early-2026-09-16'
       AND \`carried_forward_balance\` = 570.47`,
  )

  // CTZN was fully settled then hard-deleted. Keep this period's cash
  // (Food borrow + settle) so Your money does not invent the SIP payoff back.
  tryExec(
    `INSERT INTO \`account_adjustments\` (\`id\`, \`account_id\`, \`amount\`, \`note\`, \`date\`, \`created_at\`)
     SELECT 'lending-cash-mu3lccr3kjxl5y', 'bank', 1000, 'Lending cash', '2026-09-16T04:18:36.795Z', '2026-09-16T04:18:36.795Z'
     WHERE NOT EXISTS (SELECT 1 FROM \`lend_borrow_entries\` WHERE \`id\` = 'mu3lccr3kjxl5y')
       AND NOT EXISTS (SELECT 1 FROM \`account_adjustments\` WHERE \`id\` = 'lending-cash-mu3lccr3kjxl5y')`,
  )
  tryExec(
    `INSERT INTO \`account_adjustments\` (\`id\`, \`account_id\`, \`amount\`, \`note\`, \`date\`, \`created_at\`)
     SELECT 'lending-cash-mu4cnuos1qeep3', 'bank', -6004.52, 'Lending cash', '2026-09-16T17:03:33.148Z', '2026-09-16T17:03:33.148Z'
     WHERE NOT EXISTS (SELECT 1 FROM \`lend_borrow_entries\` WHERE \`id\` = 'mu4cnuos1qeep3')
       AND NOT EXISTS (SELECT 1 FROM \`account_adjustments\` WHERE \`id\` = 'lending-cash-mu4cnuos1qeep3')`,
  )
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
  if (migrationsPromise) {
    await migrationsPromise
    // Idempotent patches must still run after hot reload / new code.
    applySchemaPatches()
    return
  }

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
    } catch (error) {
      // Additive migration failures must not wipe user data. Only reset when the
      // schema is unusable (no buckets table after a failed migrate).
      console.error('Migration failed:', error)
      const bucketsOk = sqlite.getFirstSync(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='buckets'`,
      )
      if (!bucketsOk) {
        console.warn('DB unusable after migration failure — rebuilding empty schema')
        for (const table of [...APP_TABLES, '__drizzle_migrations']) {
          sqlite.execSync(`DROP TABLE IF EXISTS "${table}"`)
        }
        await migrate(db, migrations)
        console.log('DB recovered after hard reset')
      } else {
        console.warn('Keeping existing data; relying on schema patches')
      }
    }

    // Never let a patch failure wipe user data — patches are idempotent ALTERs.
    try {
      applySchemaPatches()
    } catch (error) {
      console.error('Schema patches failed:', error)
    }

    const afterCount = countRecordedMigrations()
    if (afterCount > beforeCount) {
      console.log(`DB migrations applied (${beforeCount} → ${afterCount})`)
    }
  })()

  try {
    await migrationsPromise
  } catch (error) {
    migrationsPromise = null
    throw error
  }
}

// Ensure critical columns exist as soon as this module loads (before store hydration).
try {
  applySchemaPatches()
} catch (error) {
  console.warn('Initial schema patches failed:', error)
}
