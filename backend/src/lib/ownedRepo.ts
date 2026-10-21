import { DATA, positionAfter, previewOf, TABLE_NAMES, type Table } from '@map/shared'
import { and, desc, eq, getTableColumns, isNull, sql, type SQL } from 'drizzle-orm'
import * as schema from '../db/schema'
import { hasChanges, userId, type Ctx, type Repo } from './crud'
import { HttpError } from './errors'
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
 * - a parent (`objectType` + `objectId`) is checked when a write sets it: the parent row exists in the table its type names, is the
 *   user's, and does not make a cycle (a folder in itself or in its own children). Writes that do not set a parent read nothing for it
 * - a new row without a `position` goes last in its group (same parent, pinned or not): one read through the list index
 * - deleting a row sets the parent of its children (rows of any table pointing at it) to none: they become orphans, not lost
 */
/** How many levels up a parent chain is followed looking for a cycle */
const MAX_DEPTH = 20

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

  const bad = (message: string, code: 'UNKNOWN_REFERENCE' | 'VALIDATION_FAILED' = 'UNKNOWN_REFERENCE') =>
    new HttpError(400, code, message, [{ path: 'objectId', message }])

  /**
   * Checks the parent a write sets: its table has the row, the row is the user's (one lookup by primary key); and, for a parent in
   * this same table, that the row is not in its own subtree (one recursive query up the chain, at most MAX_DEPTH levels).
   * `selfId`: the row being moved (undefined: a new row, which nothing can point at yet)
   */
  async function checkParent(ctx: Ctx, fields: Fields, selfId?: number) {
    const type = fields.objectType
    const parentId = fields.objectId
    if (!config.link || typeof type !== 'string' || typeof parentId !== 'number') return // no parent set by this write
    const parentTableName = config.link.types[type]
    const parent = parentTableName ? (schema as unknown as Record<string, OwnedTable>)[parentTableName] : undefined
    if (!parent) throw bad(`Unknown parent type ${type}`)
    const parentColumns = getTableColumns(parent)
    const found = await ctx.db
      .select({ id: parentColumns.id })
      .from(parent)
      .where(and(eq(parentColumns.id, parentId), eq(parentColumns.userId, userId(ctx))))
      .get()
    if (!found) throw bad('Parent not found')
    if (selfId === undefined || parentTableName !== config.tableName) return
    if (parentId === selfId) throw bad('Cannot be inside itself', 'VALIDATION_FAILED')
    // Up from the new parent through this table's parents: reaching the row itself means a cycle
    const t = sql.identifier(config.tableName)
    const own = userId(ctx)
    const cycle = await ctx.db.all(sql`
      WITH RECURSIVE up(id, type, parent, depth) AS (
        SELECT id, object_type, object_id, 0 FROM ${t} WHERE id = ${parentId} AND user_id = ${own}
        UNION ALL
        SELECT p.id, p.object_type, p.object_id, up.depth + 1 FROM ${t} p JOIN up ON up.type = ${type} AND p.id = up.parent
        WHERE p.user_id = ${own} AND up.depth < ${MAX_DEPTH}
      )
      SELECT 1 FROM up WHERE id = ${selfId} LIMIT 1`)
    if (cycle.length > 0) throw bad('Cannot be inside its own children', 'VALIDATION_FAILED')
  }

  /**
   * The position of a new row that has none: after the last row of its group (the user's live rows with the same parent and the
   * same pinned flag), read through the list index (its columns are exactly these, then position): one row read
   */
  async function lastPosition(ctx: Ctx, fields: Fields): Promise<string> {
    const same = (column: (typeof columns)[string], value: unknown) => (value === null || value === undefined ? isNull(column) : eq(column, value))
    const last = await ctx.db
      .select({ position: columns.position })
      .from(table)
      .where(
        and(
          eq(columns.userId, userId(ctx)),
          eq(columns.archived, (fields.archived as boolean | undefined) ?? false),
          ...(config.link ? [same(columns.objectType, fields.objectType), same(columns.objectId, fields.objectId)] : []),
          ...(config.order.pinned ? [eq(columns.pinned, (fields.pinned as boolean | undefined) ?? false)] : []),
        ),
      )
      .orderBy(desc(columns.position), desc(columns.id))
      .limit(1)
      .get()
    return positionAfter(last?.position as string | undefined)
  }

  /** The tables whose rows can have a row of this table as their parent: [table, the objectType naming this table] */
  const childTables = TABLE_NAMES.flatMap((name) =>
    Object.entries((DATA[name] as unknown as Table).link?.types ?? {})
      .filter(([, target]) => target === config.tableName || target === config.name)
      .map(([type]) => [schema[name] as unknown as OwnedTable, type] as const),
  )

  /** The children of a deleted row lose their parent (one UPDATE per table that can have children of this kind) */
  async function orphanChildren(ctx: Ctx, id: number) {
    for (const [child, type] of childTables) {
      const c = getTableColumns(child)
      await ctx.db
        .update(child)
        .set({ objectType: null, objectId: null })
        .where(and(eq(c.userId, userId(ctx)), eq(c.objectType, type), eq(c.objectId, id)))
    }
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
      await checkParent(ctx, fields)
      const placed = config.order.position && fields.position === undefined ? { ...fields, position: await lastPosition(ctx, fields) } : fields
      const row = (await ctx.db.insert(table).values({ ...withPreview(placed), userId: userId(ctx) }).returning().get()) as Row
      return toJson(row)
    },

    // updated_at is refreshed by the schema on every update
    async update(ctx, id, input) {
      const fields = overrides.beforeUpdate ? await overrides.beforeUpdate(ctx, id, input) : input
      if (!hasChanges(fields)) return repo.get(ctx, id) // nothing to change (Drizzle rejects an empty SET): the row as it is
      await checkParent(ctx, fields, id)
      const row = (await ctx.db.update(table).set(withPreview(fields)).where(mine(ctx, id)).returning().get()) as Row | undefined
      return row ? toJson(row) : null
    },

    async remove(ctx, id) {
      const gone = await ctx.db.delete(table).where(mine(ctx, id)).returning({ id: columns.id }).get()
      if (gone === undefined) return false
      await orphanChildren(ctx, id)
      return true
    },
  }
  return repo
}
