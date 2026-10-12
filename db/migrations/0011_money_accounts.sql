-- drizzle migration 0011 (also applied via applySchemaPatches)
ALTER TABLE `transactions` ADD COLUMN `account_id` text;
