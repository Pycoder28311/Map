import { relations } from 'drizzle-orm'
import { sqliteTable, integer, text, primaryKey, index } from 'drizzle-orm/sqlite-core'
import { user } from './auth-schema'
export * from './auth-schema'

// Same columns in every table, written once
const id = () => integer('id').primaryKey({ autoIncrement: true })
const createdAt = () => integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
const owner = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })

/* ─────────────── Notes (example resource) ─────────────── */

export const notes = sqliteTable(
    'notes',
    {
        id: id(),
        userId: owner(),
        text: text('text').notNull(),
    },
    (t) => [index('notes_user_id_idx').on(t.userId)],
)

/* ─────────────── Images: files in R2 (under IMAGES_FOLDER), one row per file ─────────────── */

export const images = sqliteTable('images', {
    id: id(),
    userId: owner(),
    key: text('key').notNull().unique(), // full R2 key, folder included (e.g. map/img/<uuid>.jpg)
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
})

/* ─────────────── Image links: which images belong to a note, in carousel order ─────────────── */

export const noteImages = sqliteTable(
    'note_images',
    {
        noteId: integer('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
        imageId: integer('image_id').notNull().references(() => images.id, { onDelete: 'cascade' }),
        position: integer('position').notNull(),
    },
    (t) => [primaryKey({ columns: [t.noteId, t.imageId] })],
)

/* ─────────────── Relations: let one query load an item with its children ─────────────── */

export const notesRelations = relations(notes, ({ many }) => ({
    images: many(noteImages),
}))

export const noteImagesRelations = relations(noteImages, ({ one }) => ({
    note: one(notes, { fields: [noteImages.noteId], references: [notes.id] }),
    image: one(images, { fields: [noteImages.imageId], references: [images.id] }),
}))
