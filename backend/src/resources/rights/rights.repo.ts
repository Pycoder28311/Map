import { ROLES, SHAREABLE, type Right, type RightsApply, type RightsFilter, type Role, type ShareableName, type Sharing, type Visibility } from '@map/shared'
import { and, asc, eq, getTableColumns, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import * as schema from '../../db/schema'
import { objectRights, user } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError, notFound } from '../../lib/errors'
import type { OwnedTable } from '../../lib/ownedTable'
import { inParts } from '../../lib/relations'

/** One right given by POST /api/object-rights (the privacy panel uses /apply: every change at once) */
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

/** A write that named a user who does not exist (the foreign key refused it): 400, and the batch wrote nothing */
function unknownUser(error: unknown): never {
  const text = `${error instanceof Error ? error.message : ''} ${(error as { cause?: Error })?.cause?.message ?? ''}`
  if (/FOREIGN KEY/i.test(text)) throw new HttpError(400, 'UNKNOWN_REFERENCE', 'Unknown person', [{ path: 'userId', message: 'Not found' }])
  throw error
}

const notSelf = (ctx: Ctx, ids: string[]) => {
  if (ids.includes(userId(ctx))) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'userId', message: 'The owner has every right already' }])
}

/** One right with what the routes answer: the person's name and picture */
async function oneRight(ctx: Ctx, id: number): Promise<Right | null> {
  const row = await ctx.db
    .select({ right: objectRights, name: user.name, image: user.image })
    .from(objectRights)
    .innerJoin(user, eq(user.id, objectRights.userId))
    .where(eq(objectRights.id, id))
    .get()
  if (!row) return null
  await ownRow(ctx, row.right.objectType as ShareableName, row.right.objectId)
  return { id: row.right.id, role: row.right.role as Role, user: { id: row.right.userId, name: row.name, image: row.image } }
}

/**
 * The rights of a shared row (docs/plans/34), its owner's only: the list of one row's people (`?objectType=&objectId=`), and one right
 * at a time. The privacy panel reads the list when it opens and sends every change at once with `applyRights`
 */
export const rightsRepo: Repo<z.infer<typeof rightInput>, z.infer<typeof rightUpdate>, Right, RightsFilter, Right> = {
  async list(ctx, _page, filter) {
    await ownRow(ctx, filter.objectType, filter.objectId)
    return { items: await rightsOf(ctx, filter.objectType, filter.objectId), nextCursor: null }
  },

  get: (ctx, id) => oneRight(ctx, id),

  async create(ctx, input) {
    await ownRow(ctx, input.objectType, input.objectId)
    notSelf(ctx, [input.userId])
    const row = await ctx.db
      .insert(objectRights)
      .values({ ...input, grantedBy: userId(ctx) })
      .onConflictDoUpdate({ target: [objectRights.objectType, objectRights.objectId, objectRights.userId], set: { role: input.role } })
      .returning({ id: objectRights.id })
      .get()
      .catch(unknownUser)
    return (await oneRight(ctx, row.id))!
  },

  async update(ctx, id, input) {
    if (!(await oneRight(ctx, id))) return null
    await ctx.db.update(objectRights).set({ role: input.role }).where(eq(objectRights.id, id))
    return oneRight(ctx, id)
  },

  async remove(ctx, id) {
    if (!(await oneRight(ctx, id))) return false
    await ctx.db.delete(objectRights).where(eq(objectRights.id, id))
    return true
  },
}

/**
 * The privacy panel's Apply: the visibility (when it changed), the people given a role and the people taken out, in one batch (all or
 * nothing). Reads the row once before (its owner, its visibility) and its people once after: the panel shows the answer
 */
export async function applyRights(ctx: Ctx, input: RightsApply): Promise<Sharing> {
  const { objectType: name, objectId: id } = input
  const before = await ownRow(ctx, name, id)
  notSelf(ctx, input.set.map((s) => s.userId))
  const table = tableOf(name)
  const c = getTableColumns(table)
  const visibility = input.visibility ?? before.visibility
  const rows = input.set.map((s) => ({ objectType: name, objectId: id, userId: s.userId, role: s.role, grantedBy: userId(ctx) }))
  const statements = [
    // One INSERT per part that D1 can bind (a row binds 6 values)
    ...inParts(rows, 8).map((part) =>
      ctx.db
        .insert(objectRights)
        .values(part)
        .onConflictDoUpdate({ target: [objectRights.objectType, objectRights.objectId, objectRights.userId], set: { role: sql`excluded.role` } }),
    ),
    ...(input.remove.length > 0
      ? [ctx.db.delete(objectRights).where(and(eq(objectRights.objectType, name), eq(objectRights.objectId, id), inArray(objectRights.userId, input.remove)))]
      : []),
    // Not a change of the row's own fields: its version stays
    ...(visibility !== before.visibility ? [ctx.db.update(table).set({ visibility }).where(eq(c.id, id))] : []),
  ]
  if (statements.length > 0) await ctx.db.batch(statements as [never, ...never[]]).catch(unknownUser)
  return { visibility, rights: await rightsOf(ctx, name, id) }
}
