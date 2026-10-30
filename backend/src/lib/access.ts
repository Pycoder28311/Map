import type { ItemAccess, Role, ShareableName, Visibility } from '@map/shared'
import { and, eq, getTableColumns } from 'drizzle-orm'
import { objectRights } from '../db/schema'
import { userId, type Ctx } from './crud'
import type { OwnedTable } from './ownedTable'

type Row = Record<string, unknown> & { id: number; userId: string; archived: boolean }

/**
 * What a person may do with a shared row: its owner, the role their right gives, or reader when it is public. null: nothing (the
 * row then behaves like a missing one: 404, so nobody learns it exists). A row in the Trash is its owner's only
 */
export function accessFrom(row: { userId: string; archived: boolean; visibility?: unknown }, me: string, role: Role | null): ItemAccess | null {
  if (row.userId === me) return 'owner'
  if (row.archived) return null
  if (role) return role
  return (row.visibility as Visibility | undefined) === 'public' ? 'reader' : null
}

/**
 * A shared row and what the signed-in user may do with it, in one query: the row (primary key) and the user's right on it (the
 * unique index of object_rights). null when there is no such row or they may not see it
 */
export async function accessOf(ctx: Ctx, name: ShareableName, table: OwnedTable, id: number): Promise<{ row: Row; access: ItemAccess } | null> {
  const me = userId(ctx)
  const c = getTableColumns(table)
  const found = (await ctx.db
    .select({ row: table, role: objectRights.role })
    .from(table)
    .leftJoin(objectRights, and(eq(objectRights.objectType, name), eq(objectRights.objectId, c.id), eq(objectRights.userId, me)))
    .where(eq(c.id, id))
    .get()) as { row: Row; role: Role | null } | undefined
  if (!found) return null
  const access = accessFrom(found.row, me, found.role)
  return access ? { row: found.row, access } : null
}

/** Whether this access may change the row's own fields (title, text…) */
export const canEdit = (access: ItemAccess | null | undefined) => access === 'owner' || access === 'editor'
