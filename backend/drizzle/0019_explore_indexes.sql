-- Explore (docs/plans/41): an index of each explorable table's public rows not in the Trash, newest first (the order of GET /api/explore), so its
-- list reads only them, with no sort. Only CREATE INDEX: no table rebuild, no data changed.
CREATE INDEX `articles_explore_idx` ON `articles` (`visibility`,`archived`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `folders_explore_idx` ON `folders` (`visibility`,`archived`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `maps_explore_idx` ON `maps` (`visibility`,`archived`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `projects_explore_idx` ON `projects` (`visibility`,`archived`,`created_at`,`id`);