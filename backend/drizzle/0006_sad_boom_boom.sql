CREATE TABLE `articles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`preview` text DEFAULT '' NOT NULL,
	`object_type` text,
	`object_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "articles_object_pair" CHECK(("articles"."object_type" IS NULL) = ("articles"."object_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `articles_list_idx` ON `articles` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);--> statement-breakpoint
CREATE TABLE `folders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`object_type` text,
	`object_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "folders_object_pair" CHECK(("folders"."object_type" IS NULL) = ("folders"."object_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `folders_list_idx` ON `folders` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);--> statement-breakpoint
CREATE TABLE `object_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`preview` text DEFAULT '' NOT NULL,
	`object_type` text,
	`object_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "object_cards_object_pair" CHECK(("object_cards"."object_type" IS NULL) = ("object_cards"."object_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `object_cards_list_idx` ON `object_cards` (`user_id`,`archived`,`object_type`,`object_id`,"pinned" desc,`position`,`id`);