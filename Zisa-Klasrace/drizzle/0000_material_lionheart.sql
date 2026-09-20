CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room` text NOT NULL,
	`token` text NOT NULL,
	`name` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`mistakes` integer DEFAULT 0 NOT NULL,
	`finished` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `players_room_idx` ON `players` (`room`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`settings` text NOT NULL,
	`questions` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`started` integer DEFAULT 0 NOT NULL,
	`created` integer NOT NULL
);
