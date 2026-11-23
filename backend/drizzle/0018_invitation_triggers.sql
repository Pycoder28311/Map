-- Maps are shareable now (0017): a map's rights go with it, as the other tables' do (0012). And an item's invitations go with it
-- (projects, folders, articles, maps: the ones people are invited to; docs/plans/40), pending and answered, so no inbox card points at
-- nothing. invitations can't have a foreign key to four tables, so each deletes its rows' invitations after a DELETE (rows deleted by a
-- cascade too: an account deleted with its rows). Written by hand: drizzle-kit does not make triggers. Tested in src/db/migrations.test.ts.
CREATE TRIGGER `maps_rights_cleanup` AFTER DELETE ON `maps` BEGIN
  DELETE FROM `object_rights` WHERE `object_type` = 'maps' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `projects_invitations_cleanup` AFTER DELETE ON `projects` BEGIN
  DELETE FROM `invitations` WHERE `object_type` = 'projects' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `folders_invitations_cleanup` AFTER DELETE ON `folders` BEGIN
  DELETE FROM `invitations` WHERE `object_type` = 'folders' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `articles_invitations_cleanup` AFTER DELETE ON `articles` BEGIN
  DELETE FROM `invitations` WHERE `object_type` = 'articles' AND `object_id` = OLD.`id`;
END;--> statement-breakpoint
CREATE TRIGGER `maps_invitations_cleanup` AFTER DELETE ON `maps` BEGIN
  DELETE FROM `invitations` WHERE `object_type` = 'maps' AND `object_id` = OLD.`id`;
END;
