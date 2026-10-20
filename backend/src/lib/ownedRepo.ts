import { previewOf, type Table } from '@map/shared'
import { and, eq, getTableColumns, isNull, type SQL } from 'drizzle-orm'
import { hasChanges, userId, type Ctx, type Repo } from './crud'
import type { OwnedTable } from './ownedTable'
import { fetchLimit, mapPage, toPage } from './pagination'
import { listSort, sortColumnsOf } from './sort'

type Row = Record<string, unknown> & { id: number }
type Fields = Record<string, unknown>
type Filter = { archived: boolean; objectType?: string; objectId?: number }

/** What a table can do its own way; the rest stays the generic one */
export type RepoOverrides = {
  /** The JSON of a row (default: every column but the owner, dates as ISO strings) */
  toJson?: (row: Row) => Record<string, unknown>
  /** Changes the fields of a new row before it is written (after the contract checked them) */
  beforeCreate?: (ctx: Ctx, fields: Fields) => Fields | Promise<Fields>
  /** Changes the fields of an update before it is written */
  beforeUpdate?: (ctx: Ctx, id: number, fields: Fields) => Fields | Promise<Fields>
}

/**
 * The data functions of a user-owned table (crudRoutes turns them into routes), from its config (shared/src/data.config.ts):
 * - every query is the signed-in user's rows only: someone else's row behaves like a missing one
 * - list: the config's order (pinned, position, id) a page at a time, filtered by `archived` and, for a linked table, by parent
 *   (`objectType: 'none'` = no parent); a table with a `preview` lists without the field it stands for (not even read)
 * - the preview is written with its field, in the same write, so the two never differ
 */
export function ownedRepo(table: OwnedTable, config: Table, overrides: RepoOverrides = {}): Repo<Fields, Fields, Record<string, unknown>, Filter, Record<string, unknown>> {
  const columns = getTableColumns(table)
  const sort = listSort(sortColumnsOf(table as never, config.order))
  // A list leaves out the field the preview stands for (up to 100 KB of HTML each)
  const listColumns = Object.fromEntries(Object.entries(columns).filter(([name]) => name !== config.preview)) as typeof columns

  const toJson =
    overrides.toJson ??
    ((row: Row) => {
      const { userId: _owner, createdAt, updatedAt, ...rest } = row
      return { ...rest, createdAt: (createdAt as Date).toISOString(), updatedAt: (updatedAt as Date).toISOString() }
    })

  const withPreview = (fields: Fields) => {
    const source = config.preview
    if (!source || fields[source] === undefined) return fields
    return { ...fields, preview: previewOf(fields[source] as string) }
  }

  const mine = (ctx: Ctx, id: number) => and(eq(columns.id, id), eq(columns.userId, userId(ctx)))

  const parentFilter = ({ objectType, objectId }: Filter): SQL | undefined => {
    if (!config.link || objectType === undefined) return undefined
    // Both columns, so the list index (… object_type, object_id …) is used; the CHECK keeps them empty together
    if (objectType === 'none') return and(isNull(columns.objectType), isNull(columns.objectId))
    return and(eq(columns.objectType, objectType), objectId === undefined ? undefined : eq(columns.objectId, objectId))
  }

  const repo: Repo<Fields, Fields, Record<string, unknown>, Filter, Record<string, unknown>> = {
    async list(ctx, page, filter) {
      const rows = (await ctx.db
        .select(listColumns)
        .from(table)
        .where(and(eq(columns.userId, userId(ctx)), eq(columns.archived, filter.archived), parentFilter(filter), sort.after(page)))
        .orderBy(...sort.orderBy)
        .limit(fetchLimit(page) ?? -1)) as Row[]
      return mapPage(toPage(rows, page, sort.cursorOf as (row: Row) => string), toJson)
    },

    async get(ctx, id) {
      const row = (await ctx.db.select().from(table).where(mine(ctx, id)).get()) as Row | undefined
      return row ? toJson(row) : null
    },

    async create(ctx, input) {
      const fields = overrides.beforeCreate ? await overrides.beforeCreate(ctx, input) : input
      const row = (await ctx.db.insert(table).values({ ...withPreview(fields), userId: userId(ctx) }).returning().get()) as Row
      return toJson(row)
    },

    // updated_at is refreshed by the schema on every update
    async update(ctx, id, input) {
      const fields = overrides.beforeUpdate ? await overrides.beforeUpdate(ctx, id, input) : input
      if (!hasChanges(fields)) return repo.get(ctx, id) // nothing to change (Drizzle rejects an empty SET): the row as it is
      const row = (await ctx.db.update(table).set(withPreview(fields)).where(mine(ctx, id)).returning().get()) as Row | undefined
      return row ? toJson(row) : null
    },

    async remove(ctx, id) {
      const gone = await ctx.db.delete(table).where(mine(ctx, id)).returning({ id: columns.id }).get()
      return gone !== undefined
    },
  }
  return repo
}
