import { and, eq, inArray } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { Db } from '../db'
import { HttpError } from './errors'

/** A many-to-many link table, e.g. note_images(note_id, image_id, position) */
export type LinkTable<T extends SQLiteTable> = {
  table: T
  parent: SQLiteColumn // the column pointing to the parent, e.g. noteImages.noteId
  toRow: (parentId: number, childId: number, position: number) => T['$inferInsert']
}

/**
 * Statements that replace all links of one parent with an ordered list of children.
 * Returned (not run) so callers can run them in one db.batch() together with their own writes.
 */
export function replaceLinks<T extends SQLiteTable>(db: Db, link: LinkTable<T>, parentId: number, childIds: number[]) {
  const removeOld = db.delete(link.table).where(eq(link.parent, parentId))
  if (childIds.length === 0) return [removeOld] as const
  const rows = childIds.map((childId, i) => link.toRow(parentId, childId, i))
  return [removeOld, db.insert(link.table).values(rows as never)] as const
}

/** Ids that were linked before but are not in the new list (e.g. images to clean up) */
export const removedIds = (before: number[], after: number[]) => before.filter((id) => !after.includes(id))

/** True if every id exists in `table` and belongs to `userId` (stops linking someone else's rows) */
export async function ownsAll(
  db: Db,
  table: SQLiteTable,
  cols: { id: SQLiteColumn; owner: SQLiteColumn },
  ids: number[],
  userId: string,
) {
  if (ids.length === 0) return true
  const rows = await db
    .select({ id: cols.id })
    .from(table)
    .where(and(inArray(cols.id, ids), eq(cols.owner, userId)))
  return rows.length === new Set(ids).size
}

/** Throws 400 UNKNOWN_REFERENCE when no row has this id (e.g. a reply's postId); `field` names it in the error */
export async function assertExists(db: Db, table: SQLiteTable, idColumn: SQLiteColumn, id: number, field: string) {
  const row = await db.select({ id: idColumn }).from(table).where(eq(idColumn, id)).get()
  if (!row) {
    throw new HttpError(400, 'UNKNOWN_REFERENCE', `Unknown ${field}`, [{ path: field, message: 'Not found' }])
  }
}

/** D1 binds at most 100 values in one statement: a multi-row INSERT is split so each part stays under it */
export const D1_MAX_PARAMS = 100

/** Rows in parts small enough for one INSERT each (`perRow`: how many values one row binds, counted high to be safe) */
export function inParts<T>(rows: T[], perRow: number): T[][] {
  const size = Math.max(1, Math.floor(D1_MAX_PARAMS / perRow))
  const parts: T[][] = []
  for (let i = 0; i < rows.length; i += size) parts.push(rows.slice(i, i + size))
  return parts
}

/** db.batch() for a statement list built at runtime (one transaction); does nothing when it's empty */
export async function runBatch(db: Db, statements: BatchItem<'sqlite'>[]) {
  if (statements.length === 0) return
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]])
}
