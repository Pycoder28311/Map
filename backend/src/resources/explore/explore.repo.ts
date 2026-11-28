import { EXPLORABLE, type ExplorableName, type ExploreFilter, type ExploreItem, type Page } from '@map/shared'
import { sql, type SQL } from 'drizzle-orm'
import * as schema from '../../db/schema'
import { user } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import type { OwnedTable } from '../../lib/ownedTable'
import type { PageParams } from '../../lib/pagination'

/** Where a page ends: the last item's date (seconds), table and id, newest first in that order */
type Cursor = { at: number; type: ExplorableName; id: number }

const badCursor = () => new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'cursor', message: 'Invalid cursor' }])

export const encodeExploreCursor = (c: Cursor) => btoa(JSON.stringify([c.at, c.type, c.id]))
function decodeExploreCursor(text: string): Cursor {
  try {
    const [at, type, id] = JSON.parse(atob(text)) as [number, ExplorableName, number]
    if (Number.isInteger(at) && Number.isInteger(id) && (EXPLORABLE as readonly string[]).includes(type)) return { at, type, id }
  } catch {
    // below
  }
  throw badCursor()
}

/** A search as a LIKE pattern: "contains", with % _ and \ typed matched as themselves (SQLite's LIKE ignores ASCII case) */
const pattern = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

const tableOf = (name: ExplorableName) => schema[name] as unknown as OwnedTable

/**
 * One table's part of the list: its public rows not in the Trash (through its explore index, in its order), after the cursor, matching the
 * search, at most `limit`, each with its owner's name and picture
 */
function part(name: ExplorableName, filter: ExploreFilter, after: Cursor | null, limit: number): SQL {
  const t = tableOf(name)
  const hasPreview = 'preview' in t
  const preview = hasPreview ? sql`${t.preview}` : sql`''`
  const q = filter.q ? pattern(filter.q) : null
  const search = q ? (hasPreview ? sql` AND (${t.title} LIKE ${q} ESCAPE '\\' OR ${t.preview} LIKE ${q} ESCAPE '\\')` : sql` AND ${t.title} LIKE ${q} ESCAPE '\\'`) : sql``
  // After the cursor in (date desc, table desc, id desc): the table is fixed in a part, so it decides how a row of the same date compares
  let cursor = sql``
  if (after) {
    if (name < after.type) cursor = sql` AND ${t.createdAt} <= ${after.at}`
    else if (name > after.type) cursor = sql` AND ${t.createdAt} < ${after.at}`
    else cursor = sql` AND (${t.createdAt} < ${after.at} OR (${t.createdAt} = ${after.at} AND ${t.id} < ${after.id}))`
  }
  return sql`SELECT * FROM (SELECT ${name} AS type, ${t.id} AS id, ${t.title} AS title, ${preview} AS preview, ${t.createdAt} AS created_at,
    ${user.id} AS owner_id, ${user.name} AS owner_name, ${user.image} AS owner_image
    FROM ${t} JOIN ${user} ON ${user.id} = ${t.userId}
    WHERE ${t.visibility} = 'public' AND ${t.archived} = 0${search}${cursor}
    ORDER BY ${t.createdAt} DESC, ${t.id} DESC LIMIT ${limit})`
}

type Row = { type: ExplorableName; id: number; title: string; preview: string; createdAt: number; ownerId: string; ownerName: string; ownerImage: string | null }

/**
 * Explore (docs/plans/41), through crudRoutes, list only: everyone's public objects (articles, maps, projects, folders) not in the Trash,
 * newest first, a page at a time; `q` searches their titles (and the first words of articles and projects), `type` keeps one table. One
 * query: each table's part through its own index, joined (UNION ALL), ordered and cut to the page
 */
export const exploreRepo: Repo<never, never, ExploreItem, ExploreFilter, ExploreItem> = {
  async list(ctx, page: PageParams | null, filter): Promise<Page<ExploreItem>> {
    const me = userId(ctx)
    const limit = (page?.limit ?? 24) + 1
    const after = page?.cursor ? decodeExploreCursor(page.cursor) : null
    const tables = filter.type ? [filter.type] : [...EXPLORABLE]
    const union = sql.join(
      tables.map((name) => part(name, filter, after, limit)),
      sql` UNION ALL `,
    )
    const rows = (await ctx.db
      .select({
        type: sql<ExplorableName>`u.type`,
        id: sql<number>`u.id`,
        title: sql<string>`u.title`,
        preview: sql<string>`u.preview`,
        createdAt: sql<number>`u.created_at`,
        ownerId: sql<string>`u.owner_id`,
        ownerName: sql<string>`u.owner_name`,
        ownerImage: sql<string | null>`u.owner_image`,
      })
      .from(sql`(${union}) AS u`)
      .orderBy(sql`u.created_at DESC, u.type DESC, u.id DESC`)
      .limit(limit)) as Row[]
    const more = rows.length === limit
    const items = (more ? rows.slice(0, -1) : rows).map(
      (r): ExploreItem => ({
        type: r.type,
        id: Number(r.id),
        title: r.title ?? '',
        preview: r.preview ?? '',
        createdAt: new Date(Number(r.createdAt) * 1000).toISOString(),
        owner: { id: r.ownerId, name: r.ownerName, image: r.ownerImage },
        mine: r.ownerId === me,
      }),
    )
    const last = items[items.length - 1]
    const lastRow = more ? rows[rows.length - 2] : null
    return { items, nextCursor: more && last && lastRow ? encodeExploreCursor({ at: Number(lastRow.createdAt), type: last.type, id: last.id }) : null }
  },
  // List only: an object opens through its own table's routes
  get: async () => null,
  create: async () => {
    throw new HttpError(404, 'NOT_FOUND', 'Not found')
  },
  update: async () => null,
  remove: async () => false,
}
