ALTER TABLE `buckets` ADD `show_on_home` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `playbook` ADD `user_name` text;--> statement-breakpoint
ALTER TABLE `playbook` ADD `last_checklist_month` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `type` text DEFAULT 'expense' NOT NULL;