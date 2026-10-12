import { int, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const playbook = sqliteTable('playbook', {
  id: integer('id').primaryKey(),
  userName: text('user_name'),
  monthlyIncome: real('monthly_income').notNull().default(125000),
  monthStartDay: integer('month_start_day').notNull().default(1),
  fallbackBucketId: text('fallback_bucket_id'),
  efFloor: real('ef_floor').notNull().default(150000),
  efStartBalance: real('ef_start_balance').notNull().default(0),
  isOnboarded: integer('is_onboarded', { mode: 'boolean' }).notNull().default(false),
  lastChecklistMonth: text('last_checklist_month'), // format YYYY-MM
  lastBalanceRolloverMonth: text('last_balance_rollover_month'), // format YYYY-MM
  userAge: integer('user_age'),
  carriedForwardBalance: real('carried_forward_balance').default(0),
  lastSurplusRolloverMonth: text('last_surplus_rollover_month'),
  lastPersonalRebalancePromptMonth: text('last_personal_rebalance_prompt_month'),
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
  linkedGoalId: text('linked_goal_id'),
  goalBucketRole: text('goal_bucket_role', { enum: ['full', 'upfront', 'emi_reserve'] }),
  accumulates: integer('accumulates', { mode: 'boolean' }).notNull().default(false),
  accumulationCap: real('accumulation_cap'),
  capOverride: real('cap_override'),
  capOverrideReason: text('cap_override_reason'),
  capOverridePurchaseAmount: real('cap_override_purchase_amount'),
})

export const bucketBalances = sqliteTable('bucket_balances', {
  id: text('id').primaryKey(),
  bucketId: text('bucket_id').notNull(),
  balance: real('balance').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
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
  description: text('description'),
  bucketId: text('bucket_id').notNull(),
  date: text('date').notNull(), // ISO string
  source: text('source', { enum: ['manual', 'ocr', 'overlay'] }).notNull().default('manual'),
  remarks: text('remarks'),
  fundedFromBucketId: text('funded_from_bucket_id'),
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
  paymentMode: text('payment_mode', { enum: ['pay_in_full', 'upfront_emi'] }).notNull().default('pay_in_full'),
  upfrontAmount: real('upfront_amount'),
  emiTenureMonths: integer('emi_tenure_months'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  completedAt: text('completed_at'),
  freedMonthlyAmount: real('freed_monthly_amount'),
  createdAt: text('created_at').notNull(),
})

export const netWorthSnapshots = sqliteTable('net_worth_snapshots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  snapshotDate: text('snapshot_date').notNull(),
  totalAssets: real('total_assets').notNull(),
  totalLiabilities: real('total_liabilities').notNull().default(0),
  note: text('note'),
})

export const contacts = sqliteTable('contacts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
})

export const lendBorrowEntries = sqliteTable('lend_borrow_entries', {
  id: text('id').primaryKey(),
  contactId: text('contact_id').notNull(),
  type: text('type', { enum: ['lend', 'borrow', 'settle'] }).notNull(),
  amount: real('amount').notNull(),
  note: text('note'),
  date: text('date').notNull(),
  createdAt: text('created_at').notNull(),
})
