CREATE TABLE `paired_device` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `token_hash` text NOT NULL,
  `time_created` integer NOT NULL,
  `time_updated` integer NOT NULL,
  `time_last_seen` integer,
  `revoked` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paired_device_token_idx` ON `paired_device` (`token_hash`);
