ALTER TABLE `job` ADD `verify` text;
--> statement-breakpoint
ALTER TABLE `job` ADD `verify_retries` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `job` ADD `verify_result` text;
--> statement-breakpoint
ALTER TABLE `job` ADD `tokens_in` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `job` ADD `tokens_out` integer DEFAULT 0 NOT NULL;
