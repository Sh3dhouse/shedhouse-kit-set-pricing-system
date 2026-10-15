CREATE TABLE `quote_history` (
	`quote_id` text NOT NULL,
	`revision` integer NOT NULL,
	`document` text NOT NULL,
	`action` text NOT NULL,
	`changed_at` text NOT NULL,
	`changed_by` text NOT NULL,
	`changed_by_email` text NOT NULL,
	PRIMARY KEY(`quote_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`variant` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`created_by` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_by_email` text NOT NULL,
	`archived_at` text,
	`mutation_id` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quotes_variant_updated` ON `quotes` (`variant`,`updated_at`,`id`);