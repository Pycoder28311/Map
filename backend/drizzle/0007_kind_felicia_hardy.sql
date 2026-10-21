DROP INDEX `notes_list_idx`;--> statement-breakpoint
CREATE INDEX `notes_list_idx` ON `notes` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);