-- A shared row's rights go with it (docs/plans/34): object_rights can't have a foreign key to five tables, so each of them deletes its
-- rows' rights after a DELETE. This also covers rows deleted by a cascade (an account deleted with its rows). Written by hand: drizzle-kit
-- does not make triggers. Tested in src/db/migrations.test.ts.
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
CREATE TRIGGER `object_cards_rights_cleanup` AFTER DELETE ON `object_cards` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'objectCards' AND `object_id` = OLD.`id`;
END;
