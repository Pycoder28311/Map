import { SHAREABLE, type Page, type Role, type ShareableName, type SharedItem } from '@map/shared'
import { and, desc, eq, getTableColumns, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as schema from '../../db/schema'
import { objectRights, user } from '../../db/schema'
import { userId, type Ctx } from '../../lib/crud'
import type { OwnedTable } from '../../lib/ownedTable'
import { beforeCursor, fetchLimit, toPage, type PageParams } from '../../lib/pagination'

/** Each shareable table under its own name in the query, joined on the rights that point at it */
const joined = SHAREABLE.map((name) => ({ name, table: alias(schema[name] as unknown as OwnedTable, `shared_${name}`) as unknown as OwnedTable }))
/** The first value of a column of the joined rows (only one of them matches a right) */
const firstOf = (key: 'title' | 'archived' | 'userId') =>
  sql`coalesce(${sql.join(
    joined.map((j) => sql`${getTableColumns(j.table)[key]}`),
    sql`, `,
  )})`

/**
 * "Shared with me" (docs/plans/34): the rows other people gave the caller a right on, newest first, a page at a time. One query: the
 * rights through their index (user_id, id), each joined with its row (its title, and whether it is in its owner's Trash) and the
 * owner's name. Rows in the Trash, or gone, are left out
 */
export async function listShared(ctx: Ctx, page: PageParams): Promise<Page<SharedItem>> {
  const base = ctx.db
    .select({
      id: objectRights.id,
      objectType: objectRights.objectType,
      objectId: objectRights.objectId,
      role: objectRights.role,
      title: firstOf('title') as SQL<string | null>,
      owner: sql<string | null>`${user.name}`,
    })
    .from(objectRights)
    .$dynamic()
  const withRows = joined.reduce(
    (query, { name, table }) => query.leftJoin(table, and(eq(objectRights.objectType, name), eq(getTableColumns(table).id, objectRights.objectId))) as unknown as typeof base,
    base,
  )
  const rows = await withRows
    .leftJoin(user, eq(user.id, firstOf('userId')))
    .where(and(eq(objectRights.userId, userId(ctx)), eq(firstOf('archived'), 0), beforeCursor(objectRights.id, page)))
    .orderBy(desc(objectRights.id))
    .limit(fetchLimit(page)!)
  const result = toPage(rows, page, (r) => r.id)
  return {
    items: result.items.map((r) => ({
      id: r.id,
      objectType: r.objectType as ShareableName,
      objectId: r.objectId,
      title: r.title ?? '',
      role: r.role as Role,
      owner: r.owner === null ? null : { name: r.owner },
    })),
    nextCursor: result.nextCursor,
  }
}
