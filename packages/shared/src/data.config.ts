// THE DATA CONFIG: every table of the app, in one place. The backend makes the table's columns, index, repo and routes from it
// (backend/src/lib/ownedTable.ts, ownedRepo.ts, index.ts), the contract (zod) and the types come from it (table.ts), and the app
// makes its API calls and lists from it (app/src/resources/createResource.ts). How to change it: instructions/data-config.md.
//
// After changing a table here: `npx drizzle-kit generate` in backend/, read the SQL, apply it (--local, then --remote).
import { field } from './fields'
import { defineTables, type FilterOf, type InputOf, type ItemOf, type ListItemOf, type UpdateOf } from './table'

/** Pinned first, then by position, then by id */
const ORDERED = { pinned: true, position: true } as const

/**
 * A pane of a layout, as its panel key (`note:5`, `notes`, `dashboard`: features/workspace/layout.ts panelKey), or empty (no pane there).
 * The first of the four is never empty (requireOneOf)
 */
const PANE = field.text(64, { pattern: /^$|^[a-z][A-Za-z0-9-]*(:[^\s:]{1,40})?$/ })
/** A line's place in the workspace in thousandths (0.2–0.8 of its width or height: the app's MIN and MAX) */
const LINE = field.int({ min: 200, max: 800, default: 500 })
/** The bottom row's / right column's own line of a 2×2 layout: the same range, or 0 for "joined with the other half" */
const HALF_LINE = field.int({ min: 0, max: 800, default: 0 })

/** What a linked row can point at as its parent: its `objectType`, and the table that type is (ownedRepo checks the parent there) */
const PARENT = { types: { project: 'projects', folder: 'folders' } } as const

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
  // A saved pane layout (the sidebar's Layouts section): its shape, its up to four panes and its lines. Newest first. Archived = in the
  // Trash. No screen of its own: only the Trash shows it besides the Layouts section (resources.config.ts)
  layouts: {
    access: 'owner',
    order: { pinned: false, position: false },
    fields: {
      template: field.text(16, { pattern: /^(1|2-cols|2-rows|3-left|3-right|3-top|3-bottom|4)$/, default: '1' }),
      splitX: LINE,
      splitY: LINE,
      splitX2: HALF_LINE,
      splitY2: HALF_LINE,
      panelA: PANE,
      panelB: PANE,
      panelC: PANE,
      panelD: PANE,
    },
    requireOneOf: ['panelA'],
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
