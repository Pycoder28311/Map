import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, index, check } from 'drizzle-orm/sqlite-core'
import { user } from './auth-schema'
export * from './auth-schema'

// Same columns in every table, written once
const id = () => integer('id').primaryKey({ autoIncrement: true })
const createdAt = () => integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
// Whole seconds since 1970 (not milliseconds); refreshed by Drizzle on every update it runs
const updatedAt = () =>
    integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date())
const owner = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })

/* ─────────────── Notes ─────────────── */

export const notes = sqliteTable(
    'notes',
    {
        id: id(),
        userId: owner(),
        title: text('title').notNull().default(''),
        content: text('content').notNull().default(''), // HTML from the editor, cleaned by the contract (richText)
        // Later: connects the note to another object (a project, a map...). Both set or both empty
        objectType: text('object_type'),
        objectId: integer('object_id'),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
        archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
        position: integer('position').notNull().default(0),
        pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    },
    (t) => [
        // The list view: one user's notes, filtered by archived, pinned first, then in order (its first column also serves "all of a user's notes")
        index('notes_user_list_idx').on(t.userId, t.archived, t.pinned, t.position),
        check('notes_object_pair', sql`(${t.objectType} IS NULL) = (${t.objectId} IS NULL)`),
    ],
)

/* ─────────────── Images: files in R2 (under IMAGES_FOLDER), one row per file. Notes show them as <img> in their text; other tables link them with their own link tables ─────────────── */

export const images = sqliteTable('images', {
    id: id(),
    userId: owner(),
    key: text('key').notNull().unique(), // full R2 key, folder included (e.g. map/img/<uuid>.jpg)
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
})
