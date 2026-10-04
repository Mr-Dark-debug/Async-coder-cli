CREATE TABLE `sage_invocation` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL,
  `stage` text NOT NULL,
  `reason` text NOT NULL,
  `session_id` text,
  `cost_usd` real DEFAULT 0 NOT NULL,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sage_invocation_job_idx` ON `sage_invocation` (`job_id`);
