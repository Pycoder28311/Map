CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`article_id` integer NOT NULL,
	`user_id` text,
	`parent_id` integer,
	`depth` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`reply_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "comments_depth" CHECK("comments"."depth" BETWEEN 1 AND 5),
	CONSTRAINT "comments_not_empty" CHECK(trim("comments"."content") <> '')
);
--> statement-breakpoint
CREATE INDEX `comments_article_idx` ON `comments` (`article_id`,`parent_id`,`id`);--> statement-breakpoint
CREATE TABLE `message_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`message_id` integer NOT NULL,
	`user_id` text,
	`content` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "message_replies_not_empty" CHECK(trim("message_replies"."content") <> '')
);
--> statement-breakpoint
CREATE INDEX `message_replies_message_idx` ON `message_replies` (`message_id`,`id`);