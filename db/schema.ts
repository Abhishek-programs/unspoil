import { int, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const playbook = sqliteTable('playbook', {
  id: integer('id').primaryKey(),
  userName: text('user_name'),
  monthlyIncome: real('monthly_income').notNull().default(125000),
  monthStartDay: integer('month_start_day').notNull().default(1),
  fallbackBucketId: text('fallback_bucket_id'),
  efFloor: real('ef_floor').notNull().default(150000),
  isOnboarded: integer('is_onboarded', { mode: 'boolean' }).notNull().default(false),
  lastChecklistMonth: text('last_checklist_month'), // format YYYY-MM
})

export const buckets = sqliteTable('buckets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['spending', 'savings', 'investment'] }).notNull(),
  monthlyAmount: real('monthly_amount').notNull(),
  color: text('color').notNull().default('#16A34A'),
  icon: text('icon').notNull().default('💰'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  showOnHome: integer('show_on_home', { mode: 'boolean' }).notNull().default(true),
})

export const keywordMappings = sqliteTable('keyword_mappings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  keyword: text('keyword').notNull(),
  bucketId: text('bucket_id').notNull(),
})

export const sureShotMerchants = sqliteTable('sure_shot_merchants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  merchantName: text('merchant_name').notNull(),
  bucketId: text('bucket_id').notNull(),
})

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['expense', 'income'] }).notNull().default('expense'),
  amount: real('amount').notNull(),
  merchant: text('merchant'),
  bucketId: text('bucket_id').notNull(),
  date: text('date').notNull(), // ISO string
  source: text('source', { enum: ['manual', 'ocr'] }).notNull().default('manual'),
  remarks: text('remarks'),
  parsedTxnId: text('parsed_txn_id'),
  isFlagged: integer('is_flagged', { mode: 'boolean' }).notNull().default(false),
  isRecurringDraft: integer('is_recurring_draft', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetAmount: real('target_amount').notNull(),
  monthlyContribution: real('monthly_contribution').notNull(),
  targetDate: text('target_date'),
  linkedBucketIds: text('linked_bucket_ids').notNull().default('[]'), // JSON array
  startBalance: real('start_balance').notNull().default(0),
  createdAt: text('created_at').notNull(),
})

export const netWorthSnapshots = sqliteTable('net_worth_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotDate: text('snapshot_date').notNull(),
  totalAssets: real('total_assets').notNull(),
  totalLiabilities: real('total_liabilities').notNull().default(0),
  note: text('note'),
})
