CREATE TABLE `pricing_rates` (
	`version` text PRIMARY KEY NOT NULL,
	`document` text NOT NULL,
	`published_at` text NOT NULL,
	`published_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`quote_revision` integer NOT NULL,
	`document` text NOT NULL,
	`result` text NOT NULL,
	`issued_at` text NOT NULL,
	`issued_by` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quote_issues_quote` ON `quote_issues` (`quote_id`,`quote_revision`);