ALTER TABLE `players` ADD `round` integer DEFAULT -1 NOT NULL;--> statement-breakpoint
ALTER TABLE `players` ADD `corrected` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `rooms` ADD `round` integer DEFAULT 0 NOT NULL;