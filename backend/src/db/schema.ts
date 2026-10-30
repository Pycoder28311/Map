import { DATA, SHAREABLE } from '@map/shared'
import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { createdAt, id, owner, ownedTable, updatedAt } from '../lib/ownedTable'
import { user } from './auth-schema'
export * from './auth-schema'

// Every user-owned table, made from its config (shared/src/data.config.ts; columns: lib/ownedTable.ts). A new table in the
// config needs its line here (drizzle-kit reads these exports), then `npx drizzle-kit generate`.
export const projects = ownedTable(DATA.projects)
export const notes = ownedTable(DATA.notes)
export const folders = ownedTable(DATA.folders)
export const articles = ownedTable(DATA.articles)
export const objectCards = ownedTable(DATA.objectCards)
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
    // The config name of the row's table (`notes`, `objectCards`…) and its id. No foreign key can point at five tables: a trigger on
    // each of them deletes the row's rights with it (migration 0012)
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
