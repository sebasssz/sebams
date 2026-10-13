CREATE TABLE `sebams_records` (
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`version` integer NOT NULL,
	`request_hash` text,
	PRIMARY KEY(`owner`, `key`)
);
--> statement-breakpoint
CREATE TABLE `sebams_users` (
	`owner` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`timezone` text DEFAULT 'America/La_Paz' NOT NULL,
	`last_sync` integer DEFAULT 0 NOT NULL
);
