import { ROLES, SHAREABLE, type Collaborator, type Right, type RightsApply, type RightsFilter, type Role, type ShareableName, type Sharing, type Visibility } from '@map/shared'
import { and, asc, eq, getTableColumns, inArray } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '../../db/schema'
import { objectRights, user } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError, notFound } from '../../lib/errors'
import type { OwnedTable } from '../../lib/ownedTable'

/** The shape POST /api/object-rights would take: refused, people join by an accepted invitation (docs/plans/40) */
export const rightInput = z.object({
  objectType: z.enum(SHAREABLE),
  objectId: z.number().int().positive(),
  userId: z.string().min(1).max(100),
  role: z.enum(ROLES),
})
export const rightUpdate = z.object({ role: z.enum(ROLES) })

const tableOf = (name: ShareableName) => schema[name] as unknown as OwnedTable

/** The caller's own row of this table (its visibility), or 404: only the owner sees and changes who may see a row (one read) */
async function ownRow(ctx: Ctx, name: ShareableName, id: number): Promise<{ visibility: Visibility }> {
  const table = tableOf(name)
  const c = getTableColumns(table)
  const row = (await ctx.db
    .select({ visibility: c.visibility })
    .from(table)
    .where(and(eq(c.id, id), eq(c.userId, userId(ctx))))
    .get()) as { visibility: Visibility } | undefined
  if (!row) throw notFound()
  return row
}

/** The people of a row with their names and pictures, in the order they were given their right */
async function rightsOf(ctx: Ctx, name: ShareableName, id: number): Promise<Right[]> {
  const rows = await ctx.db
    .select({ id: objectRights.id, role: objectRights.role, userId: user.id, name: user.name, image: user.image })
    .from(objectRights)
    .innerJoin(user, eq(user.id, objectRights.userId))
    .where(and(eq(objectRights.objectType, name), eq(objectRights.objectId, id)))
    .orderBy(asc(objectRights.id))
  return rows.map((r) => ({ id: r.id, role: r.role as Role, user: { id: r.userId, name: r.name, image: r.image } }))
}

/** One right with the person's name and picture, and the row's owner (the routes say who may see or change it) */
async function rightRow(ctx: Ctx, id: number) {
  const row = await ctx.db
    .select({ right: objectRights, name: user.name, image: user.image })
    .from(objectRights)
    .innerJoin(user, eq(user.id, objectRights.userId))
    .where(eq(objectRights.id, id))
    .get()
  if (!row) return null
  return { right: { id: row.right.id, role: row.right.role as Role, user: { id: row.right.userId, name: row.name, image: row.image } } as Right, objectType: row.right.objectType as ShareableName, objectId: row.right.objectId }
}

/** One right, for its row's owner: null when there is none or it is not theirs */
async function ownersRight(ctx: Ctx, id: number): Promise<Right | null> {
  const found = await rightRow(ctx, id)
  if (!found) return null
  const owns = await ownRow(ctx, found.objectType, found.objectId).then(
    () => true,
    () => false,
  )
  return owns ? found.right : null
}

/**
 * The people of a shared row as its creator and its collaborators see them (docs/plans/40): the creator first, then the others in the
 * order they joined. Two reads (the row with its owner; its rights). Anyone else, a reader of a public row too, gets 404
 */
export async function collaboratorsOf(ctx: Ctx, name: ShareableName, id: number): Promise<Collaborator[]> {
  const me = userId(ctx)
  const table = tableOf(name)
  const c = getTableColumns(table)
  const row = (await ctx.db
    .select({ ownerId: user.id, name: user.name, image: user.image, archived: c.archived })
    .from(table)
    .innerJoin(user, eq(user.id, c.userId))
    .where(eq(c.id, id))
    .get()) as { ownerId: string; name: string; image: string | null; archived: boolean } | undefined
  if (!row) throw notFound()
  const rights = await rightsOf(ctx, name, id)
  const mine = row.ownerId === me
  if (!mine && (row.archived || !rights.some((r) => r.user.id === me))) throw notFound()
  return [{ id: null, role: 'owner', user: { id: row.ownerId, name: row.name, image: row.image } }, ...rights]
}

/**
 * The rights of a shared row (docs/plans/34, 40): the list of one row's people (`?objectType=&objectId=`: its creator and its
 * collaborators may read it), a role changed by the creator, and a right taken away by the creator or given up by its collaborator.
 * Nobody is added here: a person joins by accepting an invitation (resources/invitations)
 */
export const rightsRepo: Repo<z.infer<typeof rightInput>, z.infer<typeof rightUpdate>, Right, RightsFilter, Collaborator> = {
  async list(ctx, _page, filter) {
    return { items: await collaboratorsOf(ctx, filter.objectType, filter.objectId), nextCursor: null }
  },

  get: (ctx, id) => ownersRight(ctx, id),

  async create() {
    throw new HttpError(403, 'FORBIDDEN', 'People join by invitation: invite someone you follow')
  },

  async update(ctx, id, input) {
    if (!(await ownersRight(ctx, id))) return null
    await ctx.db.update(objectRights).set({ role: input.role }).where(eq(objectRights.id, id))
    return ownersRight(ctx, id)
  },

  async remove(ctx, id) {
    const found = await rightRow(ctx, id)
    if (!found) return false
    // A collaborator leaving; else only the row's owner takes a right away
    if (found.right.user.id !== userId(ctx)) await ownRow(ctx, found.objectType, found.objectId)
    await ctx.db.delete(objectRights).where(eq(objectRights.id, id))
    return true
  },
}

/**
 * The privacy panel's Apply: the visibility (when it changed) and the people taken out, in one batch (all or nothing). Reads the row
 * once before (its owner, its visibility) and its people once after: the panel shows the answer
 */
export async function applyRights(ctx: Ctx, input: RightsApply): Promise<Sharing> {
  const { objectType: name, objectId: id } = input
  const before = await ownRow(ctx, name, id)
  const table = tableOf(name)
  const c = getTableColumns(table)
  const visibility = input.visibility ?? before.visibility
  const statements = [
    ...(input.remove.length > 0
      ? [ctx.db.delete(objectRights).where(and(eq(objectRights.objectType, name), eq(objectRights.objectId, id), inArray(objectRights.userId, input.remove)))]
      : []),
    // Not a change of the row's own fields: its version stays
    ...(visibility !== before.visibility ? [ctx.db.update(table).set({ visibility }).where(eq(c.id, id))] : []),
  ]
  if (statements.length > 0) await ctx.db.batch(statements as [never, ...never[]])
  return { visibility, rights: await rightsOf(ctx, name, id) }
}
