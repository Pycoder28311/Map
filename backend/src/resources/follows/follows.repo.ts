import { SHAREABLE, type Follow, type FollowCounts, type FollowInput, type FollowItem, type FollowsFilter, type Page, type ShareableName } from '@map/shared'
import { and, desc, eq, exists, getTableColumns, inArray, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as schema from '../../db/schema'
import { follows, invitations, objectRights, user } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError, notFound } from '../../lib/errors'
import type { OwnedTable } from '../../lib/ownedTable'
import { beforeCursor, fetchLimit, toPage, type PageParams } from '../../lib/pagination'

/** 30 follows and invitations a minute per person (the SOCIAL_WRITES binding, wrangler.jsonc): no database read */
export async function socialLimit(ctx: Ctx) {
  const { success } = await ctx.env.SOCIAL_WRITES.limit({ key: userId(ctx) })
  if (!success) throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many at once. Please wait a minute and try again.')
}

const tableOf = (name: ShareableName) => schema[name] as unknown as OwnedTable

/**
 * Whether `me` and `other` collaborate (docs/plans/40, U9): one of them has a right on a row of the other's. One read: the rights of the
 * two people (through object_rights_user_idx), each joined with its row's owner. Only asked when someone looks at another's lists
 */
export async function collaborate(ctx: Ctx, me: string, other: string): Promise<boolean> {
  const partner = sql`CASE WHEN ${objectRights.userId} = ${me} THEN ${other} ELSE ${me} END`
  const ownedBy = SHAREABLE.map((name) => {
    const table = tableOf(name)
    const c = getTableColumns(table)
    return and(
      eq(objectRights.objectType, name),
      exists(ctx.db.select({ one: sql`1` }).from(table).where(and(eq(c.id, objectRights.objectId), eq(c.userId, partner)))),
    )
  })
  const found = await ctx.db
    .select({ one: sql`1` })
    .from(objectRights)
    .where(and(inArray(objectRights.userId, [me, other]), or(...ownedBy)))
    .limit(1)
    .get()
  return found !== undefined
}

/** Someone's lists may be read by themselves and their collaborators; anyone else gets 404 (nobody learns who follows whom) */
async function listOwner(ctx: Ctx, asked: string | undefined): Promise<string> {
  const me = userId(ctx)
  if (asked === undefined || asked === me) return me
  if (!(await collaborate(ctx, me, asked))) throw notFound()
  return asked
}

const other = alias(user, 'other')
const back = alias(follows, 'back')

/** A follow I am in (as its follower or the person followed) */
const mineOrToMe = (me: string) => or(eq(follows.followerId, me), eq(follows.followeeId, me))

const followJson = (row: typeof follows.$inferSelect): Follow => ({
  id: row.id,
  followerId: row.followerId,
  followeeId: row.followeeId,
  since: row.createdAt.toISOString(),
})

/** A follow that names a user who does not exist (the foreign key refused it): 400 */
function unknownUser(error: unknown): never {
  const text = `${error instanceof Error ? error.message : ''} ${(error as { cause?: Error })?.cause?.message ?? ''}`
  if (/FOREIGN KEY/i.test(text)) throw new HttpError(400, 'UNKNOWN_REFERENCE', 'Unknown person', [{ path: 'userId', message: 'Not found' }])
  throw error
}

/**
 * Following people (docs/plans/40), through crudRoutes:
 * - list: someone's followers or the people they follow (`direction`), newest first, a page at a time; each with whether the follow
 *   goes back the other way too. One query (the followers through follows_followee_idx, the following through follows_pair)
 * - create: follow (nothing changes when I follow them already); delete: unfollow, or remove one of my followers. An unfollow also
 *   cancels the invitations I sent them that are still pending (U7), in the same batch
 * - get: one follow I am in; update: nothing to change (404)
 */
export const followsRepo: Repo<FollowInput, Record<string, never>, Follow, FollowsFilter, FollowItem> = {
  async list(ctx, page, filter): Promise<Page<FollowItem>> {
    const owner = await listOwner(ctx, filter.userId)
    const followers = filter.direction === 'followers'
    // On Followers: the other person is the follower, and the follow goes back when the owner follows them; on Following, the reverse
    const otherId = followers ? follows.followerId : follows.followeeId
    const rows = await ctx.db
      .select({ id: follows.id, createdAt: follows.createdAt, userId: other.id, name: other.name, image: other.image, back: back.id })
      .from(follows)
      .innerJoin(other, eq(other.id, otherId))
      .leftJoin(back, followers ? and(eq(back.followerId, owner), eq(back.followeeId, follows.followerId)) : and(eq(back.followerId, follows.followeeId), eq(back.followeeId, owner)))
      .where(and(followers ? eq(follows.followeeId, owner) : eq(follows.followerId, owner), beforeCursor(follows.id, page as PageParams | null)))
      .orderBy(desc(follows.id))
      .limit(fetchLimit(page) ?? -1)
    const result = toPage(rows, page, (r) => r.id)
    return {
      items: result.items.map((r) => ({
        id: r.id,
        user: { id: r.userId, name: r.name, image: r.image },
        since: r.createdAt.toISOString(),
        mutual: r.back !== null,
      })),
      nextCursor: result.nextCursor,
    }
  },

  async get(ctx, id) {
    const row = await ctx.db.select().from(follows).where(and(eq(follows.id, id), mineOrToMe(userId(ctx)))).get()
    return row ? followJson(row) : null
  },

  async create(ctx, input) {
    const me = userId(ctx)
    if (input.userId === me) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'userId', message: 'You cannot follow yourself' }])
    await socialLimit(ctx)
    const made = await ctx.db
      .insert(follows)
      .values({ followerId: me, followeeId: input.userId })
      .onConflictDoNothing()
      .returning()
      .get()
      .catch(unknownUser)
    const row = made ?? (await ctx.db.select().from(follows).where(and(eq(follows.followerId, me), eq(follows.followeeId, input.userId))).get())
    return followJson(row!)
  },

  update: async () => null,

  async remove(ctx, id) {
    const me = userId(ctx)
    // Unfollowing: the invitations I sent them that are still pending go first (the follow is still there to name them)
    const [, gone] = await ctx.db.batch([
      ctx.db
        .delete(invitations)
        .where(
          and(
            eq(invitations.senderId, me),
            eq(invitations.status, 'pending'),
            eq(invitations.recipientId, sql`(SELECT ${follows.followeeId} FROM ${follows} WHERE ${follows.id} = ${id} AND ${follows.followerId} = ${me})`),
          ),
        ),
      ctx.db.delete(follows).where(and(eq(follows.id, id), mineOrToMe(me))).returning({ id: follows.id }),
    ])
    return gone.length > 0
  },
}

/** GET /api/follows/counts: how many follow someone and how many they follow (themselves or a collaborator asks); one read */
export async function followCounts(ctx: Ctx, asked: string | undefined): Promise<FollowCounts> {
  const owner = await listOwner(ctx, asked)
  const row = await ctx.db
    .select({
      followers: sql<number>`(SELECT count(*) FROM ${follows} WHERE ${follows.followeeId} = ${owner})`,
      following: sql<number>`(SELECT count(*) FROM ${follows} WHERE ${follows.followerId} = ${owner})`,
    })
    .from(sql`(SELECT 1)`)
    .get()
  return { followers: Number(row?.followers ?? 0), following: Number(row?.following ?? 0) }
}
