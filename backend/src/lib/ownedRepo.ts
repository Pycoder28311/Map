import { DATA, isShareable, positionBefore, previewOf, TABLE_NAMES, type ItemAccess, type Table } from '@map/shared'
import { and, asc, eq, exists, getTableColumns, isNull, or, sql, type SQL } from 'drizzle-orm'
import * as schema from '../db/schema'
import { accessOf } from './access'
import { hasChanges, userId, type Ctx, type Repo } from './crud'
import { forbidden, HttpError } from './errors'
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
 * - a new row without a `position` goes first, before the rows of every ordered table (same pinned flag): one read per table
 * - deleting a row sets the parent of its children (rows of any table pointing at it) to none: they become orphans, not lost
 * - a shared table (`share: true`, docs/plans/34): get and update also serve the people the row is shared with (lib/access.ts); a
 *   non-owner's JSON has no owner fields; an update of the row's own fields raises its `version`, and with `baseVersion` it is written
 *   only if that is still the version (409 CONFLICT otherwise). List, create and delete stay the owner's
 */
/** How many levels up a parent chain is followed looking for a cycle */
const MAX_DEPTH = 20

/** The fields of a shared row that are its owner's only: their sidebar, Dashboard and Trash. An editor may not send them (403) */
const OWNER_FIELDS = ['pinned', 'position', 'objectType', 'objectId', 'archived'] as const
/** What a non-owner's JSON leaves out: the owner's place for the row (their folders and projects) and who may see it */
const HIDDEN_FROM_OTHERS = ['pinned', 'position', 'objectType', 'objectId', 'visibility'] as const

export function ownedRepo(table: OwnedTable, config: Table, overrides: RepoOverrides = {}): Repo<Fields, Fields, Record<string, unknown>, Filter, Record<string, unknown>> {
  const columns = getTableColumns(table)
  const sort = listSort(sortColumnsOf(table as never, config.order))
  // A list leaves out the field the preview stands for (up to 100 KB of HTML each)
  const listColumns = Object.fromEntries(Object.entries(columns).filter(([name]) => name !== config.preview)) as typeof columns

  const baseJson: (row: Row) => Record<string, unknown> =
    overrides.toJson ??
    ((row: Row) => {
      const { userId: _owner, editedBy: _editedBy, createdAt, updatedAt, ...rest } = row
      return { ...rest, createdAt: (createdAt as Date).toISOString(), updatedAt: (updatedAt as Date).toISOString() }
    })
  const shared = config.share === true && isShareable(config.name)
  /** The row as the API sends it; a shared row also says what the caller may do, and a non-owner gets it without the owner's fields */
  const toJson = (row: Row, access: ItemAccess = 'owner') => {
    const json = baseJson(row)
    if (!shared) return json
    if (access !== 'owner') for (const key of HIDDEN_FROM_OTHERS) delete json[key]
    return { ...json, access }
  }

  const withPreview = (fields: Fields) => {
    const source = config.preview
    if (!source || fields[source] === undefined) return fields
    return { ...fields, preview: previewOf(fields[source] as string) }
  }

  const mine = (ctx: Ctx, id: number) => and(eq(columns.id, id), eq(columns.userId, userId(ctx)))
  const fieldNames = Object.keys(config.fields)

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
   * The position of a new row that has none: before every live row of the user that has a position, in every table (same pinned flag),
   * so it comes first wherever it is shown (a project's row mixes tables, whose keys compare with each other). One read of the first
   * row of each ordered table, through its list index. Nothing else is written: no other row changes its position
   */
  async function firstPosition(ctx: Ctx, fields: Fields): Promise<string> {
    const pinned = (fields.pinned as boolean | undefined) ?? false
    const firsts = await Promise.all(
      TABLE_NAMES.filter((name) => (DATA[name] as unknown as Table).order.position).map(async (name) => {
        const other = schema[name] as unknown as OwnedTable
        const c = getTableColumns(other)
        const first = await ctx.db
          .select({ position: c.position })
          .from(other)
          .where(and(eq(c.userId, userId(ctx)), eq(c.archived, (fields.archived as boolean | undefined) ?? false), (DATA[name] as unknown as Table).order.pinned ? eq(c.pinned, pinned) : undefined))
          .orderBy(asc(c.position))
          .limit(1)
          .get()
        return first?.position as string | undefined
      }),
    )
    // The smallest key (keys compare as plain strings)
    const smallest = firsts.reduce<string | undefined>((min, key) => (key !== undefined && (min === undefined || key < min) ? key : min), undefined)
    return positionBefore(smallest)
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
      return mapPage(toPage(rows, page, sort.cursorOf as (row: Row) => string), (row) => toJson(row))
    },

    async get(ctx, id) {
      if (shared) {
        const found = await accessOf(ctx, config.name as never, table, id)
        return found ? toJson(found.row, found.access) : null
      }
      const row = (await ctx.db.select().from(table).where(mine(ctx, id)).get()) as Row | undefined
      return row ? toJson(row) : null
    },

    async create(ctx, input) {
      const fields = overrides.beforeCreate ? await overrides.beforeCreate(ctx, input) : input
      await checkParent(ctx, fields)
      const placed = config.order.position && fields.position === undefined ? { ...fields, position: await firstPosition(ctx, fields) } : fields
      const row = (await ctx.db.insert(table).values({ ...withPreview(placed), userId: userId(ctx) }).returning().get()) as Row
      return toJson(row)
    },

    // updated_at is refreshed by the schema on every update
    async update(ctx, id, input) {
      if (shared) return updateShared(ctx, id, input)
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
  /**
   * The update of a shared row, in one statement when it is allowed: the owner, or an editor changing only the row's own fields with
   * the version they changed (`baseVersion`). A change of the row's own fields raises `version` and names who saved. When no row was
   * written, one read says why: gone or not theirs (null: 404), an editor sending an owner field (403) or no version (400), or a newer
   * version saved since (409, with that version and who saved it)
   */
  async function updateShared(ctx: Ctx, id: number, input: Fields) {
    const { baseVersion: base, ...patch } = input as Fields & { baseVersion?: number }
    const fields = overrides.beforeUpdate ? await overrides.beforeUpdate(ctx, id, patch) : patch
    if (!hasChanges(fields)) return repo.get(ctx, id) // nothing to change (Drizzle rejects an empty SET): the row as it is
    await checkParent(ctx, fields, id)
    const me = userId(ctx)
    const ownerOnly = OWNER_FIELDS.some((key) => fields[key] !== undefined)
    const ownFields = fieldNames.some((key) => fields[key] !== undefined)
    // An editor may change the row's own fields, saying which version they change, while it is not in the owner's Trash
    const editor =
      ownerOnly || base === undefined
        ? undefined
        : and(
            eq(columns.archived, false),
            exists(
            ctx.db
              .select({ one: sql`1` })
              .from(schema.objectRights)
              .where(
                and(
                  eq(schema.objectRights.objectType, config.name),
                  eq(schema.objectRights.objectId, id),
                  eq(schema.objectRights.userId, me),
                  eq(schema.objectRights.role, 'editor'),
                ),
              ),
            ),
          )
    const written = (await ctx.db
      .update(table)
      .set({ ...withPreview(fields), ...(ownFields ? { version: sql`${columns.version} + 1`, editedBy: me } : {}) })
      .where(and(eq(columns.id, id), base === undefined ? undefined : eq(columns.version, base), editor ? or(eq(columns.userId, me), editor) : eq(columns.userId, me)))
      .returning()
      .get()) as Row | undefined
    if (written) return toJson(written, written.userId === me ? 'owner' : 'editor')

    // Not written: say why (one read)
    const found = await accessOf(ctx, config.name as never, table, id)
    if (!found || found.access === 'reader') return null
    if (found.access === 'editor' && ownerOnly) throw forbidden('Only the owner can change this')
    if (found.access === 'editor' && base === undefined) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'baseVersion', message: 'Say which version this changes' }])
    }
    throw await conflict(ctx, found.row)
  }

  /** 409: a newer version was saved; its number and who saved it (their name, '' when unknown) */
  async function conflict(ctx: Ctx, row: Row) {
    const by = typeof row.editedBy === 'string' ? await ctx.db.select({ name: schema.user.name }).from(schema.user).where(eq(schema.user.id, row.editedBy)).get() : undefined
    return new HttpError(409, 'CONFLICT', 'A newer version was saved', [
      { path: 'version', message: String(row.version) },
      { path: 'editedBy', message: by?.name ?? '' },
    ])
  }

  return repo
}
