CREATE TABLE `practice_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`entries` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `practice_expires_idx` ON `practice_lists` (`expires`);