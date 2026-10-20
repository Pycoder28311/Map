import { DATA } from '@map/shared'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { createdAt, id, owner, ownedTable } from '../lib/ownedTable'
export * from './auth-schema'

// Every user-owned table, made from its config (shared/src/data.config.ts; columns: lib/ownedTable.ts). A new table in the
// config needs its line here (drizzle-kit reads these exports), then `npx drizzle-kit generate`.
export const projects = ownedTable(DATA.projects)
export const notes = ownedTable(DATA.notes)
export const folders = ownedTable(DATA.folders)
export const articles = ownedTable(DATA.articles)
export const objectCards = ownedTable(DATA.objectCards)

/* ─────────────── Images: files in R2 (under IMAGES_FOLDER), one row per file. Notes show them as <img> in their text (no link to this table); other tables link them with their own link tables ─────────────── */

export const images = sqliteTable('images', {
    id: id(),
    userId: owner(),
    key: text('key').notNull().unique(), // full R2 key, folder included (e.g. map/img/<uuid>.jpg)
    contentType: text('content_type').notNull(),
    size: integer('size').notNull(),
    createdAt: createdAt(),
})
