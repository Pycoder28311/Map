import type { OrderOutput, OrderSpec } from '@map/shared'
import { and, asc, desc, eq, gt, lt, or, sql, type SQL } from 'drizzle-orm'
import { index, integer, type SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { HttpError } from './errors'
import type { PageParams } from './pagination'

/**
 * The order of a list, in one place, for any table: pinned rows first (when the table has `pinned`), then by `position`
 * (when it has `position`), then by id so the order is always the same. From the same columns it makes the ORDER BY, the
 * paging condition, the cursor and the columns of the table's index, so they cannot drift apart. Pure (sort.test.ts).
 *
 *   pinned + position   pinned DESC, position, id        notes
 *   position only       position, id
 *   pinned only         pinned DESC, id DESC             (newest first inside each group)
 *   neither             id DESC                          (newest first)
 *
 * The cases are the table config's `order` flags (shared/order.ts). From them, in the table file: `...orderColumns(config.order)`
 * makes the columns and `listIndex(...)` the index; in the repo, `listSort(sortColumnsOf(table, config.order))` gives orderBy,
 * `after(page)` for the where and `cursorOf` for the next page's cursor.
 * Limit: pages after the first start at the cursor's group (e.g. the unpinned rows) and skip forward inside it, so a very deep
 * page of a very large group reads the skipped rows too; fine for lists of hundreds of rows per user.
 * Rows are expected to have the properties `id`, `pinned` and `position` (whichever the table has).
 */

type Dir = 'asc' | 'desc'
type KeyName = 'pinned' | 'position' | 'id'
export type SortKey = { name: KeyName; column: SQLiteColumn; dir: Dir }
export type SortColumns = { id: SQLiteColumn; pinned?: SQLiteColumn; position?: SQLiteColumn }

export function sortKeys({ id, pinned, position }: SortColumns): SortKey[] {
  const keys: SortKey[] = []
  if (pinned) keys.push({ name: 'pinned', column: pinned, dir: 'desc' })
  if (position) keys.push({ name: 'position', column: position, dir: 'asc' })
  keys.push({ name: 'id', column: id, dir: position ? 'asc' : 'desc' })
  return keys
}

/** The columns the order flags turn on, to spread into the table: `...orderColumns(config.order)` */
const pinnedColumn = () => integer('pinned', { mode: 'boolean' }).notNull().default(false)
const positionColumn = () => integer('position').notNull().default(0)

export function orderColumns<const O extends OrderSpec>(order: O) {
  return {
    ...(order.pinned ? { pinned: pinnedColumn() } : {}),
    ...(order.position ? { position: positionColumn() } : {}),
  } as (O['pinned'] extends true ? { pinned: ReturnType<typeof pinnedColumn> } : unknown) &
    (O['position'] extends true ? { position: ReturnType<typeof positionColumn> } : unknown)
}

/** A table (or its columns in an index callback) with the columns that its order flags turn on */
export type OrderedTable<O extends OrderSpec> = { id: SQLiteColumn } & (O['pinned'] extends true ? { pinned: SQLiteColumn } : unknown) &
  (O['position'] extends true ? { position: SQLiteColumn } : unknown)

/** The sort columns of a table, picked by its order flags */
export function sortColumnsOf<O extends OrderSpec>(table: OrderedTable<O>, order: O): SortColumns {
  const columns = table as unknown as Record<string, SQLiteColumn>
  return { id: columns.id, pinned: order.pinned ? columns.pinned : undefined, position: order.position ? columns.position : undefined }
}

/** The output fields of the flags that are on, from a row: `...pickOrder(row, config.order)` in the repo's toJson */
export function pickOrder<O extends OrderSpec>(row: OrderOutput<O>, order: O): OrderOutput<O> {
  const fields = row as { pinned?: boolean; position?: number }
  return {
    ...(order.pinned ? { pinned: fields.pinned } : {}),
    ...(order.position ? { position: fields.position } : {}),
  } as OrderOutput<O>
}

const order = (key: SortKey) => (key.dir === 'asc' ? asc(key.column) : desc(key.column))

/** The columns for the table's index, in the order of the list: `index(name).on(t.userId, t.archived, ...sortIndexColumns(...))` */
export const sortIndexColumns = (columns: SortColumns) =>
  sortKeys(columns).map((key) => (key.dir === 'asc' ? key.column : sql`${key.column} desc`)) as [SQL | SQLiteColumn, ...(SQL | SQLiteColumn)[]]

/**
 * The list index of a table: the owner, then the equality filters of the list (config.listFilters), then the order. Used in the
 * table's extra-config callback: `listIndex('notes_list_idx', t, { owner: 'userId', filters: notesConfig.listFilters, order: notesConfig.order })`
 */
export function listIndex<T extends { id: SQLiteColumn }, O extends OrderSpec>(
  name: string,
  table: T & OrderedTable<O>,
  { owner, filters, order }: { owner: keyof T; filters: readonly (keyof T)[]; order: O },
) {
  const columns = table as unknown as Record<string, SQLiteColumn>
  const first = columns[owner as string]
  const rest = [...filters.map((filter) => columns[filter as string]), ...sortIndexColumns(sortColumnsOf(table, order))]
  return index(name).on(first, ...(rest as [SQL | SQLiteColumn, ...(SQL | SQLiteColumn)[]]))
}

const badCursor = () => new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'cursor', message: 'Invalid cursor' }])

/** Cursors are opaque to clients: base64 of the last row's sort values */
function decodeValues(cursor: string, keys: SortKey[]): number[] {
  let values: unknown
  try {
    values = JSON.parse(atob(cursor))
  } catch {
    throw badCursor()
  }
  if (!Array.isArray(values) || values.length !== keys.length || !values.every((v) => Number.isFinite(v))) throw badCursor()
  return values as number[]
}

export function listSort(columns: SortColumns) {
  const keys = sortKeys(columns)

  // Neighbouring keys that go the same way are compared together as one row value, which SQLite can seek to in the index
  const groups: SortKey[][] = []
  for (const key of keys) {
    const last = groups.at(-1)
    if (last && last[0].dir === key.dir) last.push(key)
    else groups.push([key])
  }

  return {
    orderBy: keys.map(order),

    /** WHERE for "the rows after the cursor"; undefined on the first page or without pagination */
    after(page: PageParams | null): SQL | undefined {
      if (!page?.cursor) return undefined
      const values = decodeValues(page.cursor, keys)
      let offset = 0
      const terms = groups.map((group) => {
        const mine = values.slice(offset, offset + group.length)
        const before = and(...keys.slice(0, offset).map((key, i) => eq(key.column, values[i])))
        offset += group.length
        const later =
          group.length === 1
            ? (group[0].dir === 'asc' ? gt : lt)(group[0].column, mine[0])
            : sql`(${sql.join(group.map((k) => k.column), sql`, `)}) ${group[0].dir === 'asc' ? sql`>` : sql`<`} (${sql.join(mine.map((v) => sql`${v}`), sql`, `)})`
        return before ? and(before, later) : later
      })
      return or(...terms)
    },

    /** The cursor that continues after this row */
    cursorOf(row: { id: number; pinned?: boolean | number; position?: number }): string {
      return btoa(JSON.stringify(keys.map((key) => Number(row[key.name]))))
    },
  }
}

/** Space left between neighbouring positions, so moving one row changes only that row */
export const POSITION_STEP = 1024

/**
 * The position for a row dropped between two neighbours (undefined = no neighbour on that side). Only the moved row is
 * written; null means the gap is used up, and the caller renumbers the list in steps of POSITION_STEP.
 */
export function positionBetween(before: number | undefined, after: number | undefined): number | null {
  if (before === undefined && after === undefined) return POSITION_STEP
  if (before === undefined) return after! > 0 ? Math.floor(after! / 2) : null
  if (after === undefined) return before + POSITION_STEP
  const middle = Math.floor((before + after) / 2)
  return middle > before && middle < after ? middle : null
}
