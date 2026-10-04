ALTER TABLE `job` ADD `team_id` text;
--> statement-breakpoint
ALTER TABLE `job` ADD `role` text;
--> statement-breakpoint
CREATE INDEX `job_team_idx` ON `job` (`team_id`);
