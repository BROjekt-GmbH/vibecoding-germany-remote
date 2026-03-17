CREATE TABLE `alert_history` (
	`id` text PRIMARY KEY NOT NULL,
	`host_id` text,
	`type` text NOT NULL,
	`severity` text NOT NULL,
	`message` text NOT NULL,
	`metadata` text,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `host_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hosts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`hostname` text NOT NULL,
	`port` integer DEFAULT 22 NOT NULL,
	`username` text NOT NULL,
	`auth_method` text DEFAULT 'key' NOT NULL,
	`private_key` text,
	`group_id` text,
	`is_online` integer DEFAULT false,
	`last_seen` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `host_groups`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_login` text NOT NULL,
	`theme` text DEFAULT 'dark' NOT NULL,
	`terminal_font_size` integer DEFAULT 14 NOT NULL,
	`terminal_font_family` text DEFAULT 'MesloLGS NF' NOT NULL,
	`poll_interval_ms` integer DEFAULT 2000 NOT NULL,
	`settings` text DEFAULT '{}',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `preferences_user_login_unique` ON `preferences` (`user_login`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`host_id` text NOT NULL,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`user_login` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`layout` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `terminal_tabs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_login` text NOT NULL,
	`host_id` text NOT NULL,
	`session_name` text NOT NULL,
	`pane` text DEFAULT '0' NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `hosts`(`id`) ON UPDATE no action ON DELETE cascade
);
