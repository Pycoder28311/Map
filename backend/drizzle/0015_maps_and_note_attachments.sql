CREATE TABLE `maps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`branch_of` integer DEFAULT 0 NOT NULL,
	`file_key` text,
	`file_version` integer DEFAULT 0 NOT NULL,
	`file_size` integer DEFAULT 0 NOT NULL,
	`saved_at` integer,
	`forked_from` integer,
	`forked_version` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`position` text DEFAULT 'a0' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `maps_list_idx` ON `maps` (`user_id`,`archived`,"pinned" desc,`position`,`id`);--> statement-breakpoint
ALTER TABLE `notes` ADD `attached_type` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `attached_id` integer;--> statement-breakpoint
ALTER TABLE `notes` ADD `attached_node` integer;--> statement-breakpoint
CREATE INDEX `notes_attached_idx` ON `notes` (`user_id`,`attached_type`,`attached_id`,`attached_node`) WHERE "notes"."attached_type" IS NOT NULL;