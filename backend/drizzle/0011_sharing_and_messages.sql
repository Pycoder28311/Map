CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`user_id` text,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`done_by` text,
	`done_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`done_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "messages_not_empty" CHECK("messages"."title" <> '' OR "messages"."content" <> '')
);
--> statement-breakpoint
CREATE INDEX `messages_article_idx` ON `messages` (`article_id`,`id`);--> statement-breakpoint
CREATE TABLE `object_rights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "object_rights_type" CHECK("object_rights"."object_type" IN ('projects', 'notes', 'folders', 'articles', 'objectCards')),
	CONSTRAINT "object_rights_role" CHECK("object_rights"."role" IN ('reader', 'editor'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `object_rights_object_user` ON `object_rights` (`object_type`,`object_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `object_rights_user_idx` ON `object_rights` (`user_id`,`id`);--> statement-breakpoint
-- drizzle-kit also wanted to rebuild `articles` here, only because the infobox column's default gained `"banner":null` after 0010.
-- That default is not needed (an infobox without `banner` is read as none: shared/src/infobox.ts), so the table keeps its old default
-- and gets its three columns like the others: no copy of every article. The snapshot holds the new default, so this is not asked again.
ALTER TABLE `articles` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `articles` ADD `edited_by` text;--> statement-breakpoint
ALTER TABLE `folders` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `folders` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `folders` ADD `edited_by` text;--> statement-breakpoint
ALTER TABLE `notes` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `edited_by` text;--> statement-breakpoint
ALTER TABLE `object_cards` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `object_cards` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `object_cards` ADD `edited_by` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `edited_by` text;