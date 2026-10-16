CREATE TABLE `sebams_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sebams_accounts_email_unique` ON `sebams_accounts` (`email`);--> statement-breakpoint
CREATE TABLE `sebams_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`digest` text NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sebams_cloud` (
	`account` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`state` text,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sebams_files` (
	`account` text NOT NULL,
	`id` text NOT NULL,
	`digest` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`account`, `id`)
);
--> statement-breakpoint
CREATE TABLE `sebams_group_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`creator` text NOT NULL,
	`assignee` text NOT NULL,
	`text` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`request_id` text NOT NULL,
	`request_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `sebams_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`leader` text NOT NULL,
	`code` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sebams_groups_code_unique` ON `sebams_groups` (`code`);--> statement-breakpoint
CREATE TABLE `sebams_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`hits` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sebams_members` (
	`group_id` text NOT NULL,
	`account` text NOT NULL,
	`joined_at` integer NOT NULL,
	PRIMARY KEY(`group_id`, `account`)
);
--> statement-breakpoint
CREATE TABLE `sebams_sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
