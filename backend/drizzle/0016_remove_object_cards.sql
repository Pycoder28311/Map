-- Object cards are gone from the app. Their rows go, with their trigger (object_cards_rights_cleanup, dropped with the table), and the
-- rights given on them first: the rebuilt object_rights no longer takes their type. Edited by hand: the DELETE, and no PRAGMA
-- foreign_keys (nothing has a foreign key to object_rights, and D1 runs a migration in a transaction, where it does nothing). The other
-- tables' triggers (0012) name object_rights, so they go while it is rebuilt (renaming a table checks every trigger) and come back after.
DELETE FROM `object_rights` WHERE `object_type` = 'objectCards';--> statement-breakpoint
DROP TABLE `object_cards`;--> statement-breakpoint
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
	CONSTRAINT "object_rights_type" CHECK("__new_object_rights"."object_type" IN ('projects', 'notes', 'folders', 'articles')),
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
END;
