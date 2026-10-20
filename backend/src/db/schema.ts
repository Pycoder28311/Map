import { notesConfig } from '@map/shared'
import { sql } from 'drizzle-orm'
import { sqliteTable, integer, text, check } from 'drizzle-orm/sqlite-core'
import { listIndex, orderColumns } from '../lib/sort'
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
        // The first words of the content as plain text (shared previewOf), written with it by the notes repo: lists show this instead of the content
        preview: text('preview').notNull().default(''),
        // Later: connects the note to another object (a project, a map...). Both set or both empty
        objectType: text('object_type'),
        objectId: integer('object_id'),
        createdAt: createdAt(),
        updatedAt: updatedAt(),
        archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
        ...orderColumns(notesConfig.order), // pinned and position, whichever notesConfig (shared/src/notes.ts) turns on
    },
    (t) => [
        // The list: one user's notes, filtered (notesConfig.listFilters), in the list's order (notesConfig.order; lib/sort.ts)
        listIndex('notes_list_idx', t, { owner: 'userId', filters: notesConfig.listFilters, order: notesConfig.order }),
        check('notes_object_pair', sql`(${t.objectType} IS NULL) = (${t.objectId} IS NULL)`),
    ],
)

/* ─────────────── Images: files in R2 (under IMAGES_FOLDER), one row per file. Notes show them as <img> in their text (no link to this table); other tables link them with their own link tables ─────────────── */

export const images = sqliteTable('images', {
    id: id(),
    userId: owner(),
    key: text('key').notNull().unique(), // full R2 key, folder included (e.g. map/img/<uuid>.jpg)
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
})
