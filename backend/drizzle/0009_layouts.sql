CREATE TABLE `layouts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`template` text DEFAULT '1' NOT NULL,
	`split_x` integer DEFAULT 500 NOT NULL,
	`split_y` integer DEFAULT 500 NOT NULL,
	`split_x2` integer DEFAULT 0 NOT NULL,
	`split_y2` integer DEFAULT 0 NOT NULL,
	`panel_a` text DEFAULT '' NOT NULL,
	`panel_b` text DEFAULT '' NOT NULL,
	`panel_c` text DEFAULT '' NOT NULL,
	`panel_d` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `layouts_list_idx` ON `layouts` (`user_id`,`archived`,"id" desc);