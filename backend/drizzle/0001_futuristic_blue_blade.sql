-- notes: `text` becomes `content`, plus title, object link, timestamps, archived, position, pinned.
-- Written by hand, not as drizzle-kit generated it: SQLite cannot add a CHECK or change a column's default in place, so the
-- table is rebuilt; dropping the old `notes` would also cascade-delete every row of `note_images` (its notes link), so those
-- rows are saved first and put back. Existing notes keep their text (as `content`) and get today's time as created/updated.
CREATE TABLE `__backup_note_images` AS SELECT * FROM `note_images`;--> statement-breakpoint
CREATE TABLE `__new_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`object_type` text,
	`object_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT `notes_object_pair` CHECK ((`object_type` IS NULL) = (`object_id` IS NULL))
);--> statement-breakpoint
INSERT INTO `__new_notes` (`id`, `user_id`, `content`, `created_at`, `updated_at`) SELECT `id`, `user_id`, `text`, unixepoch(), unixepoch() FROM `notes`;--> statement-breakpoint
DROP TABLE `notes`;--> statement-breakpoint
ALTER TABLE `__new_notes` RENAME TO `notes`;--> statement-breakpoint
INSERT OR IGNORE INTO `note_images` SELECT * FROM `__backup_note_images`;--> statement-breakpoint
DROP TABLE `__backup_note_images`;--> statement-breakpoint
CREATE INDEX `notes_user_list_idx` ON `notes` (`user_id`,`archived`,`pinned`,`position`);
