import {
  INVITABLE,
  type InvitableName,
  type InvitationAnswer,
  type InvitationInput,
  type InvitationItem,
  type InvitationsFilter,
  type InvitationStatus,
  type InvitationType,
  type Page,
} from '@map/shared'
import { and, desc, eq, getTableColumns, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as schema from '../../db/schema'
import { invitations, user } from '../../db/schema'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import type { OwnedTable } from '../../lib/ownedTable'
import { beforeCursor, fetchLimit, toPage, type PageParams } from '../../lib/pagination'
import { socialLimit } from '../follows/follows.repo'
import { checkCollaborationSend, collaborationAcceptStatement } from './types/collaboration'

/**
 * What each kind of invitation does its own way (docs/plans/40): the checks before it is sent, and the statement that accepting it
 * runs (before the status changes, in one batch; it answers a row when it did its work). A new kind adds an entry here
 */
const KINDS: Record<InvitationType, { send: (ctx: Ctx, input: InvitationInput) => Promise<void>; accept: (ctx: Ctx, id: number, objectType: InvitableName) => ReturnType<typeof collaborationAcceptStatement> }> = {
  collaboration: { send: checkCollaborationSend, accept: collaborationAcceptStatement },
}

const sender = alias(user, 'sender')
const recipient = alias(user, 'recipient')
/** Each table an invitation can be about under its own name, joined on the invitations that point at it (for its title) */
const items = INVITABLE.map((name) => ({ name, table: alias(schema[name] as unknown as OwnedTable, `inv_${name}`) as unknown as OwnedTable }))
const titleOf = sql<string | null>`coalesce(${sql.join(
  items.map((j) => sql`${getTableColumns(j.table).title}`),
  sql`, `,
)})`

type Row = {
  id: number
  type: string
  status: string
  createdAt: Date
  answeredAt: Date | null
  objectType: string | null
  objectId: number | null
  payload: unknown
  senderId: string
  senderName: string
  senderImage: string | null
  recipientId: string
  recipientName: string
  recipientImage: string | null
  title: string | null
}

/** Invitations with both people and their item's title, newest first: one query (the inbox and the sent box through their indexes) */
async function select(ctx: Ctx, where: SQL | undefined, page: PageParams | null): Promise<Row[]> {
  const base = ctx.db
    .select({
      id: invitations.id,
      type: invitations.type,
      status: invitations.status,
      createdAt: invitations.createdAt,
      answeredAt: invitations.answeredAt,
      objectType: invitations.objectType,
      objectId: invitations.objectId,
      payload: invitations.payload,
      senderId: sender.id,
      senderName: sender.name,
      senderImage: sender.image,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientImage: recipient.image,
      title: titleOf,
    })
    .from(invitations)
    .innerJoin(sender, eq(sender.id, invitations.senderId))
    .innerJoin(recipient, eq(recipient.id, invitations.recipientId))
    .$dynamic()
  const joined = items.reduce(
    (query, { name, table }) => query.leftJoin(table, and(eq(invitations.objectType, name), eq(getTableColumns(table).id, invitations.objectId))) as unknown as typeof base,
    base,
  )
  return (await joined
    .where(and(where, beforeCursor(invitations.id, page)))
    .orderBy(desc(invitations.id))
    .limit(fetchLimit(page) ?? -1)) as Row[]
}

const toItem = (r: Row): InvitationItem => ({
  id: r.id,
  type: r.type as InvitationType,
  status: r.status as InvitationStatus,
  createdAt: r.createdAt.toISOString(),
  answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
  from: { id: r.senderId, name: r.senderName, image: r.senderImage },
  to: { id: r.recipientId, name: r.recipientName, image: r.recipientImage },
  object: r.objectType && r.objectId !== null ? { type: r.objectType as InvitableName, id: r.objectId, title: r.title ?? '' } : null,
  payload: (typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload) as InvitationItem['payload'],
})

/** One invitation I sent or received */
async function one(ctx: Ctx, id: number): Promise<InvitationItem | null> {
  const me = userId(ctx)
  const [row] = await select(ctx, and(eq(invitations.id, id), or(eq(invitations.senderId, me), eq(invitations.recipientId, me))), null)
  return row ? toItem(row) : null
}

/** An invitation that names a user who does not exist (the foreign key), or one pending already (the partial unique index) */
function writeError(error: unknown): never {
  const text = `${error instanceof Error ? error.message : ''} ${(error as { cause?: Error })?.cause?.message ?? ''}`
  if (/FOREIGN KEY/i.test(text)) throw new HttpError(400, 'UNKNOWN_REFERENCE', 'Unknown person', [{ path: 'recipientId', message: 'Not found' }])
  if (/UNIQUE/i.test(text)) throw new HttpError(409, 'ALREADY_INVITED', 'They have an invitation for this already')
  throw error
}

const gone = () => new HttpError(410, 'NOT_AVAILABLE', 'This item is no longer available')

/**
 * Invitations (docs/plans/40), through crudRoutes:
 * - list: my inbox or the ones I sent (`box`), optionally of one status, kind or item, newest first, a page at a time
 * - create: the kind's checks (collaboration: my item, someone I follow, not on it already), then one write
 * - update: the recipient answers a pending one. Accept = one batch: the kind's statement (the right), then the status. When the item
 *   went to its owner's Trash or is gone, nothing is given: the invitation is removed and the answer is 410 NOT_AVAILABLE
 * - remove: the sender unsends a pending one
 */
export const invitationsRepo: Repo<InvitationInput, InvitationAnswer, InvitationItem, InvitationsFilter, InvitationItem> = {
  async list(ctx, page, filter): Promise<Page<InvitationItem>> {
    const me = userId(ctx)
    const rows = await select(
      ctx,
      and(
        filter.box === 'inbox' ? eq(invitations.recipientId, me) : eq(invitations.senderId, me),
        filter.status ? eq(invitations.status, filter.status) : undefined,
        filter.type ? eq(invitations.type, filter.type) : undefined,
        filter.objectType ? eq(invitations.objectType, filter.objectType) : undefined,
        filter.objectId !== undefined ? eq(invitations.objectId, filter.objectId) : undefined,
      ),
      page,
    )
    const result = toPage(rows, page, (r) => r.id)
    return { items: result.items.map(toItem), nextCursor: result.nextCursor }
  },

  get: (ctx, id) => one(ctx, id),

  async create(ctx, input) {
    const me = userId(ctx)
    if (input.recipientId === me) throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'recipientId', message: 'You cannot invite yourself' }])
    await socialLimit(ctx)
    await KINDS[input.type].send(ctx, input)
    const made = await ctx.db
      .insert(invitations)
      .values({ type: input.type, senderId: me, recipientId: input.recipientId, objectType: input.objectType, objectId: input.objectId, payload: input.payload })
      .returning({ id: invitations.id })
      .get()
      .catch(writeError)
    return (await one(ctx, made.id))!
  },

  async update(ctx, id, answer) {
    const me = userId(ctx)
    const pendingMine = and(eq(invitations.id, id), eq(invitations.recipientId, me), eq(invitations.status, 'pending'))
    const answered = { status: answer.status, answeredAt: new Date() }
    if (answer.status === 'declined') {
      const written = await ctx.db.update(invitations).set(answered).where(pendingMine).returning({ id: invitations.id })
      return written.length > 0 ? one(ctx, id) : null
    }
    // Accept: what it is about first (one read), then the kind's write and the status, in one batch
    const found = await ctx.db.select({ type: invitations.type, objectType: invitations.objectType }).from(invitations).where(pendingMine).get()
    if (!found) return null
    const kind = KINDS[found.type as InvitationType]
    const [given, written] = await ctx.db.batch([
      kind.accept(ctx, id, found.objectType as InvitableName),
      ctx.db.update(invitations).set(answered).where(pendingMine).returning({ id: invitations.id }),
    ])
    if (written.length === 0) return null
    if ((given as unknown[]).length === 0) {
      await ctx.db.delete(invitations).where(eq(invitations.id, id))
      throw gone()
    }
    return one(ctx, id)
  },

  async remove(ctx, id) {
    const me = userId(ctx)
    const gone = await ctx.db
      .delete(invitations)
      .where(and(eq(invitations.id, id), eq(invitations.senderId, me), eq(invitations.status, 'pending')))
      .returning({ id: invitations.id })
    return gone.length > 0
  },
}

/** GET /api/invitations/pending-count: the inbox badge; one count on invitations_recipient_idx */
export async function pendingCount(ctx: Ctx): Promise<{ count: number }> {
  const row = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(invitations)
    .where(and(eq(invitations.recipientId, userId(ctx)), eq(invitations.status, 'pending')))
    .get()
  return { count: Number(row?.count ?? 0) }
}
