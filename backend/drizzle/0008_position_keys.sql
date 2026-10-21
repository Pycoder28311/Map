-- position: integer → fractional-indexing key (text). Written by hand (drizzle-kit would copy every table and quote the
-- index wrongly): the index is dropped, a text column is added and filled with the keys a0, a1, … in today's order per user
-- (pinned first, then id; the same keys as shared/position.ts integerKey), the integer column is dropped and the new one renamed.
-- Row data is not copied. One UPDATE per table: one write per row, once.
DROP INDEX `projects_list_idx`;--> statement-breakpoint
ALTER TABLE `projects` ADD `position_key` text DEFAULT 'a0' NOT NULL;--> statement-breakpoint
UPDATE `projects` SET `position_key` = k.key FROM (SELECT id, CASE WHEN n < 62 THEN 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', n + 1, 1) WHEN n < 3906 THEN 'b' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) / 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) % 62 + 1, 1) ELSE 'c' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 3844 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 62 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) % 62 + 1, 1) END AS key FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1 AS n FROM `projects`)) AS k WHERE `projects`.id = k.id;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `position`;--> statement-breakpoint
ALTER TABLE `projects` RENAME COLUMN `position_key` TO `position`;--> statement-breakpoint
CREATE INDEX `projects_list_idx` ON `projects` (`user_id`,`archived`,"pinned" desc,`position`,`id`);
--> statement-breakpoint
DROP INDEX `notes_list_idx`;--> statement-breakpoint
ALTER TABLE `notes` ADD `position_key` text DEFAULT 'a0' NOT NULL;--> statement-breakpoint
UPDATE `notes` SET `position_key` = k.key FROM (SELECT id, CASE WHEN n < 62 THEN 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', n + 1, 1) WHEN n < 3906 THEN 'b' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) / 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) % 62 + 1, 1) ELSE 'c' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 3844 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 62 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) % 62 + 1, 1) END AS key FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1 AS n FROM `notes`)) AS k WHERE `notes`.id = k.id;--> statement-breakpoint
ALTER TABLE `notes` DROP COLUMN `position`;--> statement-breakpoint
ALTER TABLE `notes` RENAME COLUMN `position_key` TO `position`;--> statement-breakpoint
CREATE INDEX `notes_list_idx` ON `notes` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);
--> statement-breakpoint
DROP INDEX `folders_list_idx`;--> statement-breakpoint
ALTER TABLE `folders` ADD `position_key` text DEFAULT 'a0' NOT NULL;--> statement-breakpoint
UPDATE `folders` SET `position_key` = k.key FROM (SELECT id, CASE WHEN n < 62 THEN 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', n + 1, 1) WHEN n < 3906 THEN 'b' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) / 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) % 62 + 1, 1) ELSE 'c' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 3844 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 62 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) % 62 + 1, 1) END AS key FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1 AS n FROM `folders`)) AS k WHERE `folders`.id = k.id;--> statement-breakpoint
ALTER TABLE `folders` DROP COLUMN `position`;--> statement-breakpoint
ALTER TABLE `folders` RENAME COLUMN `position_key` TO `position`;--> statement-breakpoint
CREATE INDEX `folders_list_idx` ON `folders` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);
--> statement-breakpoint
DROP INDEX `articles_list_idx`;--> statement-breakpoint
ALTER TABLE `articles` ADD `position_key` text DEFAULT 'a0' NOT NULL;--> statement-breakpoint
UPDATE `articles` SET `position_key` = k.key FROM (SELECT id, CASE WHEN n < 62 THEN 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', n + 1, 1) WHEN n < 3906 THEN 'b' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) / 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) % 62 + 1, 1) ELSE 'c' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 3844 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 62 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) % 62 + 1, 1) END AS key FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1 AS n FROM `articles`)) AS k WHERE `articles`.id = k.id;--> statement-breakpoint
ALTER TABLE `articles` DROP COLUMN `position`;--> statement-breakpoint
ALTER TABLE `articles` RENAME COLUMN `position_key` TO `position`;--> statement-breakpoint
CREATE INDEX `articles_list_idx` ON `articles` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);
--> statement-breakpoint
DROP INDEX `object_cards_list_idx`;--> statement-breakpoint
ALTER TABLE `object_cards` ADD `position_key` text DEFAULT 'a0' NOT NULL;--> statement-breakpoint
UPDATE `object_cards` SET `position_key` = k.key FROM (SELECT id, CASE WHEN n < 62 THEN 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', n + 1, 1) WHEN n < 3906 THEN 'b' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) / 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 62) % 62 + 1, 1) ELSE 'c' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 3844 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) / 62 % 62 + 1, 1) || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', (n - 3906) % 62 + 1, 1) END AS key FROM (SELECT id, row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1 AS n FROM `object_cards`)) AS k WHERE `object_cards`.id = k.id;--> statement-breakpoint
ALTER TABLE `object_cards` DROP COLUMN `position`;--> statement-breakpoint
ALTER TABLE `object_cards` RENAME COLUMN `position_key` TO `position`;--> statement-breakpoint
CREATE INDEX `object_cards_list_idx` ON `object_cards` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);
