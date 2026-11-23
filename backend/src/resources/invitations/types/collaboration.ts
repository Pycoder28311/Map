import type { InvitableName, InvitationInput } from '@map/shared'
import { and, eq, exists, getTableColumns, sql } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import { follows, objectRights } from '../../../db/schema'
import { userId, type Ctx } from '../../../lib/crud'
import { HttpError, notFound } from '../../../lib/errors'
import type { OwnedTable } from '../../../lib/ownedTable'

const tableOf = (name: InvitableName) => schema[name] as unknown as OwnedTable

type Collaboration = Extract<InvitationInput, { type: 'collaboration' }>

/**
 * Sending a collaboration invitation (docs/plans/40): in one read, the item is mine and not in my Trash, I follow the person, and they
 * are not on it already. Not mine (or gone): 404; not following: 403 NOT_FOLLOWING; on it already: 409 ALREADY_COLLABORATOR
 */
export async function checkCollaborationSend(ctx: Ctx, input: Collaboration) {
  const me = userId(ctx)
  const table = tableOf(input.objectType)
  const c = getTableColumns(table)
  const found = await ctx.db
    .select({
      owner: c.userId,
      archived: c.archived,
      following: sql<number>`${exists(ctx.db.select({ one: sql`1` }).from(follows).where(and(eq(follows.followerId, me), eq(follows.followeeId, input.recipientId))))}`,
      already: sql<number>`${exists(
        ctx.db
          .select({ one: sql`1` })
          .from(objectRights)
          .where(and(eq(objectRights.objectType, input.objectType), eq(objectRights.objectId, input.objectId), eq(objectRights.userId, input.recipientId))),
      )}`,
    })
    .from(table)
    .where(eq(c.id, input.objectId))
    .get()
  if (!found || found.owner !== me || found.archived) throw notFound()
  if (!Number(found.following)) throw new HttpError(403, 'NOT_FOLLOWING', 'You can invite only people you follow')
  if (Number(found.already)) throw new HttpError(409, 'ALREADY_COLLABORATOR', 'They are a collaborator already: change their role instead')
}

/**
 * Accepting: the right, written only while the invitation is still pending and mine, and its item is still its sender's and not in the
 * Trash. One statement, run in the same batch before the invitation's status changes (so a second Accept writes nothing). Answers the
 * new right's id, or no row
 */
export function collaborationAcceptStatement(ctx: Ctx, invitationId: number, objectType: InvitableName) {
  const me = userId(ctx)
  const table = tableOf(objectType)
  const c = getTableColumns(table)
  const now = Math.floor(Date.now() / 1000)
  return ctx.db.all<{ id: number }>(sql`
    INSERT INTO ${objectRights} (object_type, object_id, user_id, role, granted_by, created_at)
    SELECT i.object_type, i.object_id, i.recipient_id, json_extract(i.payload, '$.role'), i.sender_id, ${now}
    FROM invitations i JOIN ${table} ON ${c.id} = i.object_id
    WHERE i.id = ${invitationId} AND i.recipient_id = ${me} AND i.status = 'pending' AND i.object_type = ${objectType}
      AND ${c.userId} = i.sender_id AND ${c.archived} = 0
    ON CONFLICT (object_type, object_id, user_id) DO UPDATE SET role = excluded.role
    RETURNING id`)
}
