CREATE TABLE `buckets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`monthly_amount` real NOT NULL,
	`color` text DEFAULT '#16A34A' NOT NULL,
	`icon` text DEFAULT '💰' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_amount` real NOT NULL,
	`monthly_contribution` real NOT NULL,
	`target_date` text,
	`linked_bucket_ids` text DEFAULT '[]' NOT NULL,
	`start_balance` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `keyword_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`bucket_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `net_worth_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`snapshot_date` text NOT NULL,
	`total_assets` real NOT NULL,
	`total_liabilities` real DEFAULT 0 NOT NULL,
	`note` text
);
--> statement-breakpoint
CREATE TABLE `playbook` (
	`id` integer PRIMARY KEY NOT NULL,
	`monthly_income` real DEFAULT 125000 NOT NULL,
	`month_start_day` integer DEFAULT 1 NOT NULL,
	`fallback_bucket_id` text,
	`ef_floor` real DEFAULT 150000 NOT NULL,
	`is_onboarded` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sure_shot_merchants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`merchant_name` text NOT NULL,
	`bucket_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`amount` real NOT NULL,
	`merchant` text,
	`bucket_id` text NOT NULL,
	`date` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`remarks` text,
	`parsed_txn_id` text,
	`is_flagged` integer DEFAULT false NOT NULL,
	`is_recurring_draft` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
