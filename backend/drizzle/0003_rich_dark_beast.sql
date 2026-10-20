DROP INDEX `notes_user_list_idx`;--> statement-breakpoint
CREATE INDEX `notes_list_idx` ON `notes` (`user_id`,`archived`,"pinned" desc,`position`,`id`);