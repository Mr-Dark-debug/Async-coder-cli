CREATE TABLE `job` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text,
  `name` text NOT NULL,
  `prompt` text NOT NULL,
  `agent` text,
  `model` text,
  `status` text DEFAULT 'queued' NOT NULL,
  `directory` text,
  `branch` text,
  `budget_usd` real,
  `cost_usd` real DEFAULT 0 NOT NULL,
  `error` text,
  `result` text,
  `notified` integer DEFAULT 0 NOT NULL,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL,
  `time_started` integer,
  `time_finished` integer
);
--> statement-breakpoint
CREATE INDEX `job_status_idx` ON `job` (`status`, `time_created`);
