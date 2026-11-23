import { DATA, INVITABLE, INVITATION_STATUSES, INVITATION_TYPES, SHAREABLE } from '@map/shared'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { createdAt, id, owner, ownedTable, updatedAt } from '../lib/ownedTable'
import { user } from './auth-schema'
export * from './auth-schema'

// Every user-owned table, made from its config (shared/src/data.config.ts; columns: lib/ownedTable.ts). A new table in the
// config needs its line here (drizzle-kit reads these exports), then `npx drizzle-kit generate`.
export const projects = ownedTable(DATA.projects)
export const notes = ownedTable(DATA.notes)
export const folders = ownedTable(DATA.folders)
export const articles = ownedTable(DATA.articles)
// A map's board is one file in R2 (docs/plans/38): which one, its version (a save says which it replaces) and where the map was branched from
export const maps = ownedTable(DATA.maps, {
  // null: never saved (an empty board)
  fileKey: text('file_key'),
  fileVersion: integer('file_version').notNull().default(0),
  fileSize: integer('file_size').notNull().default(0),
  savedAt: integer('saved_at', { mode: 'timestamp' }),
  // The map it was branched from and that map's version then (no foreign key: it may be deleted)
  forkedFrom: integer('forked_from'),
  forkedVersion: integer('forked_version'),
})
export const layouts = ownedTable(DATA.layouts)

/* ─────────────── Images: files in R2 (under IMAGES_FOLDER), one row per file. Notes show them as <img> in their text (no link to this table); other tables link them with their own link tables ─────────────── */

export const images = sqliteTable('images', {
    id: id(),
    userId: owner(),
    key: text('key').notNull().unique(), // full R2 key, folder included (e.g. map/img/<uuid>.jpg)
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
})

/* ─────────────── Sharing (docs/plans/34): who else may read or edit a shared row; the owner has no row here ─────────────── */

// The table names a right can point at, as SQL (`'projects', 'notes', …`): the CHECK below
const shareableList = sql.raw(SHAREABLE.map((name) => `'${name}'`).join(', '))

export const objectRights = sqliteTable(
  'object_rights',
  {
    id: id(),
    // The config name of the row's table (`notes`, `articles`, `maps`…) and its id. No foreign key can point at five tables: a trigger
    // on each of them deletes the row's rights with it (migrations 0012, 0017)
    objectType: text('object_type').notNull(),
    objectId: integer('object_id').notNull(),
    userId: owner(),
    role: text('role', { enum: ['reader', 'editor'] }).notNull(),
    grantedBy: text('granted_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    // One right per person and row; also the index of every access check
    uniqueIndex('object_rights_object_user').on(t.objectType, t.objectId, t.userId),
    // "Shared with me", newest first
    index('object_rights_user_idx').on(t.userId, t.id),
    check('object_rights_type', sql`${t.objectType} IN (${shareableList})`),
    check('object_rights_role', sql`${t.role} IN ('reader', 'editor')`),
  ],
)

/* ─────────────── Follows (docs/plans/40): who follows whom; no approval. Following someone lets you invite them to collaborate ─────────────── */

export const follows = sqliteTable(
  'follows',
  {
    id: id(),
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followeeId: text('followee_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    // Once per pair; also the "following" list's index and the invitation check (do I follow them?)
    uniqueIndex('follows_pair').on(t.followerId, t.followeeId),
    // A person's followers, newest first, and their count
    index('follows_followee_idx').on(t.followeeId, t.id),
    check('follows_not_self', sql`${t.followerId} <> ${t.followeeId}`),
  ],
)

/* ─────────────── Invitations (docs/plans/40): one table for every kind (shared/src/invitations.ts); only `collaboration` for now ─────────────── */

const sqlList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(', '))

export const invitations = sqliteTable(
  'invitations',
  {
    id: id(),
    type: text('type').notNull(),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // What it is about (a kind about no item leaves both empty). No foreign key can point at four tables: a trigger on each deletes the
    // item's invitations with it (migration 0018)
    objectType: text('object_type'),
    objectId: integer('object_id'),
    // The kind's own values (collaboration: { role }), checked by its zod schema
    payload: text('payload', { mode: 'json' }).notNull().default({}),
    status: text('status').notNull().default('pending'),
    createdAt: createdAt(),
    answeredAt: integer('answered_at', { mode: 'timestamp' }),
  },
  (t) => [
    // The inbox (pending first, newest first) and its badge's count
    index('invitations_recipient_idx').on(t.recipientId, t.status, t.id),
    // An item's invitations in its privacy panel; the ones to cancel when their sender unfollows the recipient
    index('invitations_sender_idx').on(t.senderId, t.objectType, t.objectId, t.status),
    // One pending invitation of a kind per item and person (a new one after a decline is fine)
    uniqueIndex('invitations_pending_once')
      .on(t.type, t.objectType, t.objectId, t.recipientId)
      .where(sql`${t.status} = 'pending'`),
    check('invitations_type', sql`${t.type} IN (${sqlList(INVITATION_TYPES)})`),
    check('invitations_status', sql`${t.status} IN (${sqlList(INVITATION_STATUSES)})`),
    check('invitations_object', sql`${t.objectType} IS NULL OR ${t.objectType} IN (${sqlList(INVITABLE)})`),
    check('invitations_object_pair', sql`(${t.objectType} IS NULL) = (${t.objectId} IS NULL)`),
    check('invitations_not_self', sql`${t.senderId} <> ${t.recipientId}`),
  ],
)

/* ─────────────── Messages (docs/plans/34): an article's messages, written by its editors; the text links them by id ─────────────── */

export const messages = sqliteTable(
  'messages',
  {
    id: id(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    // The author; null once their account is deleted ("Deleted user")
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    doneBy: text('done_by').references(() => user.id, { onDelete: 'set null' }),
    // Done = done_at set (it stays when the account of who pressed Done is deleted)
    doneAt: integer('done_at', { mode: 'timestamp' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // An article's messages, newest first ("Not in the text")
    index('messages_article_idx').on(t.articleId, t.id),
    check('messages_not_empty', sql`${t.title} <> '' OR ${t.content} <> ''`),
  ],
)

/* ─────────────── Replies under a message (docs/plans/37): one flat list, written by the article's editors; they go with the message ─────────────── */

export const messageReplies = sqliteTable(
  'message_replies',
  {
    id: id(),
    messageId: integer('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    // The author; null once their account is deleted ("Deleted user")
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // A message's replies, newest first, a page at a time
    index('message_replies_message_idx').on(t.messageId, t.id),
    check('message_replies_not_empty', sql`trim(${t.content}) <> ''`),
  ],
)

/* ─────────────── Comments below an article (docs/plans/37): written by its readers; a reply is a comment with a parent ─────────────── */

export const comments = sqliteTable(
  'comments',
  {
    id: id(),
    articleId: integer('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    // The author; null once their account is deleted ("Deleted user")
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    // The comment it answers (null: a top comment). Deleting a comment deletes every level under it
    parentId: integer('parent_id').references((): AnySQLiteColumn => comments.id, { onDelete: 'cascade' }),
    // 1 (a top comment) to 5: kept, so a reply's level is known without reading its parents
    depth: integer('depth').notNull().default(1),
    content: text('content').notNull(),
    // Its direct replies ("Show 3 replies" without reading them)
    replyCount: integer('reply_count').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // An article's top comments (parent_id IS NULL, newest first) and a comment's replies (parent_id = ?, oldest first)
    index('comments_article_idx').on(t.articleId, t.parentId, t.id),
    check('comments_depth', sql`${t.depth} BETWEEN 1 AND 5`),
    check('comments_not_empty', sql`trim(${t.content}) <> ''`),
  ],
)
