CREATE TABLE `session_checkpoint` (
  `id` text PRIMARY KEY NOT NULL,
  `session_id` text NOT NULL REFERENCES `session`(`id`) ON DELETE CASCADE,
  `directory` text NOT NULL,
  `description` text NOT NULL,
  `snapshot` text NOT NULL,
  `time_created` integer NOT NULL,
  `automatic` integer DEFAULT 0 NOT NULL,
  `files` text NOT NULL,
  `conversation` text NOT NULL,
  `status` text DEFAULT 'ready' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `session_checkpoint_session_idx` ON `session_checkpoint` (`session_id`, `time_created`);
