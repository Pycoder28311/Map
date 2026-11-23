-- Follows and invitations (docs/plans/40), and maps become shareable: their three sharing columns, and object_rights rebuilt for its
-- CHECK to take 'maps' (SQLite cannot change a CHECK). Edited by hand, as 0016: no PRAGMA foreign_keys (nothing has a foreign key to
-- object_rights, and D1 runs a migration in a transaction, where it does nothing), and the tables' rights triggers (0012) go while
-- object_rights is rebuilt (renaming a table checks every trigger) and come back after. The rebuild keeps every id. The new triggers are 0018.
CREATE TABLE `follows` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`follower_id` text NOT NULL,
	`followee_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`follower_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followee_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "follows_not_self" CHECK("follows"."follower_id" <> "follows"."followee_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follows_pair` ON `follows` (`follower_id`,`followee_id`);--> statement-breakpoint
CREATE INDEX `follows_followee_idx` ON `follows` (`followee_id`,`id`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`sender_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`object_type` text,
	`object_id` integer,
	`payload` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`answered_at` integer,
	FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "invitations_type" CHECK("invitations"."type" IN ('collaboration')),
	CONSTRAINT "invitations_status" CHECK("invitations"."status" IN ('pending', 'accepted', 'declined')),
	CONSTRAINT "invitations_object" CHECK("invitations"."object_type" IS NULL OR "invitations"."object_type" IN ('projects', 'folders', 'articles', 'maps')),
	CONSTRAINT "invitations_object_pair" CHECK(("invitations"."object_type" IS NULL) = ("invitations"."object_id" IS NULL)),
	CONSTRAINT "invitations_not_self" CHECK("invitations"."sender_id" <> "invitations"."recipient_id")
);
--> statement-breakpoint
CREATE INDEX `invitations_recipient_idx` ON `invitations` (`recipient_id`,`status`,`id`);--> statement-breakpoint
CREATE INDEX `invitations_sender_idx` ON `invitations` (`sender_id`,`object_type`,`object_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_pending_once` ON `invitations` (`type`,`object_type`,`object_id`,`recipient_id`) WHERE "invitations"."status" = 'pending';--> statement-breakpoint
DROP TRIGGER `projects_rights_cleanup`;--> statement-breakpoint
DROP TRIGGER `notes_rights_cleanup`;--> statement-breakpoint
DROP TRIGGER `folders_rights_cleanup`;--> statement-breakpoint
DROP TRIGGER `articles_rights_cleanup`;--> statement-breakpoint
CREATE TABLE `__new_object_rights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`object_type` text NOT NULL,
	`object_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`granted_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`granted_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "object_rights_type" CHECK("__new_object_rights"."object_type" IN ('projects', 'notes', 'folders', 'articles', 'maps')),
	CONSTRAINT "object_rights_role" CHECK("__new_object_rights"."role" IN ('reader', 'editor'))
);
--> statement-breakpoint
INSERT INTO `__new_object_rights`("id", "object_type", "object_id", "user_id", "role", "granted_by", "created_at") SELECT "id", "object_type", "object_id", "user_id", "role", "granted_by", "created_at" FROM `object_rights`;--> statement-breakpoint
DROP TABLE `object_rights`;--> statement-breakpoint
ALTER TABLE `__new_object_rights` RENAME TO `object_rights`;--> statement-breakpoint
CREATE UNIQUE INDEX `object_rights_object_user` ON `object_rights` (`object_type`,`object_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `object_rights_user_idx` ON `object_rights` (`user_id`,`id`);--> statement-breakpoint
CREATE TRIGGER `projects_rights_cleanup` AFTER DELETE ON `projects` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'projects' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `notes_rights_cleanup` AFTER DELETE ON `notes` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'notes' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `folders_rights_cleanup` AFTER DELETE ON `folders` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'folders' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `articles_rights_cleanup` AFTER DELETE ON `articles` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'articles' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
ALTER TABLE `maps` ADD `visibility` text DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `edited_by` text;