// THE DATA CONFIG: every table of the app, in one place. The backend makes the table's columns, index, repo and routes from it
// (backend/src/lib/ownedTable.ts, ownedRepo.ts, index.ts), the contract (zod) and the types come from it (table.ts), and the app
// makes its API calls and lists from it (app/src/resources/createResource.ts). How to change it: instructions/data-config.md.
//
// After changing a table here: `npx drizzle-kit generate` in backend/, read the SQL, apply it (--local, then --remote).
import { field } from './fields'
import { defineTables, type FilterOf, type InputOf, type ItemOf, type ListItemOf, type UpdateOf } from './table'

/** Pinned first, then by position, then by id */
const ORDERED = { pinned: true, position: true } as const

/** What a linked row can point at as its parent (relations come later: for now the pair is only stored) */
const PARENT = { types: ['project', 'folder'] } as const

export const DATA = defineTables({
  projects: {
    access: 'owner',
    order: ORDERED,
    fields: { title: field.text(200), content: field.richText() },
    preview: 'content',
    requireOneOf: ['title', 'content'],
  },
  notes: {
    access: 'owner',
    order: ORDERED,
    fields: { title: field.text(200), content: field.richText() },
    preview: 'content',
    requireOneOf: ['title', 'content'],
    link: PARENT,
    // Its index stays as it was (lists of notes are not filtered by parent yet)
    listFilters: ['archived'],
  },
  folders: {
    access: 'owner',
    order: ORDERED,
    fields: { title: field.text(200), description: field.plainText(2000) },
    requireOneOf: ['title'],
    link: PARENT,
  },
  articles: {
    access: 'owner',
    order: ORDERED,
    fields: { title: field.text(200), content: field.richText() },
    preview: 'content',
    requireOneOf: ['title', 'content'],
    link: PARENT,
  },
  objectCards: {
    access: 'owner',
    order: ORDERED,
    fields: { title: field.text(200), content: field.richText() },
    preview: 'content',
    requireOneOf: ['title', 'content'],
    link: PARENT,
  },
})

/** The tables' names (config keys) */
export type TableName = keyof typeof DATA
export const TABLE_NAMES = Object.keys(DATA) as TableName[]

/** The types of one table, e.g. `Item<'notes'>` */
export type Item<N extends TableName> = ItemOf<(typeof DATA)[N]>
export type ListItem<N extends TableName> = ListItemOf<(typeof DATA)[N]>
export type Input<N extends TableName> = InputOf<(typeof DATA)[N]>
export type Update<N extends TableName> = UpdateOf<(typeof DATA)[N]>
export type Filter<N extends TableName> = FilterOf<(typeof DATA)[N]>
