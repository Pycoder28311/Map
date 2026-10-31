import type { MessageReply, MessageReplyFilter, MessageReplyUpdate, Role } from '@map/shared'
import { and, eq } from 'drizzle-orm'
import { articles, messageReplies, messages, objectRights, user } from '../../db/schema'
import { accessFrom, canEdit } from '../../lib/access'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { forbidden, notFound } from '../../lib/errors'
import { messageWithAccess, repliesQuery, toRepliesPage, toReply, type AuthorRow } from './messages.repo'

type ReplyCreate = { messageId: number; content: string }

/**
 * A reply with its author and the caller's access, in one query: the reply (primary key), its message (primary key), the message's
 * article (primary key), the caller's right on it (unique index) and the reply's author (primary key). null when it is gone or the
 * caller can't read the article
 */
async function replyWithAccess(ctx: Ctx, id: number) {
  const me = userId(ctx)
  const found = await ctx.db
    .select({
      reply: messageReplies,
      owner: articles.userId,
      archived: articles.archived,
      visibility: articles.visibility,
      role: objectRights.role,
      name: user.name,
      image: user.image,
    })
    .from(messageReplies)
    .innerJoin(messages, eq(messages.id, messageReplies.messageId))
    .innerJoin(articles, eq(articles.id, messages.articleId))
    .leftJoin(objectRights, and(eq(objectRights.objectType, 'articles'), eq(objectRights.objectId, articles.id), eq(objectRights.userId, me)))
    .leftJoin(user, eq(user.id, messageReplies.userId))
    .where(eq(messageReplies.id, id))
    .get()
  if (!found) return null
  const access = accessFrom({ userId: found.owner, archived: found.archived, visibility: found.visibility }, me, found.role as Role | null)
  return access ? { row: found.reply, author: { name: found.name, image: found.image }, access, me } : null
}

/** The signed-in user as a reply's author (from the session: no read) */
const me = (ctx: Ctx): AuthorRow => ({ name: ctx.user?.name ?? '', image: ctx.user?.image ?? null })

/**
 * The replies under a message (docs/plans/37): a flat list, newest first. The newest come with the message (messagesRepo.get); `list`
 * reads the earlier ones. Everyone who can read the article reads them; its editors and owner write them; a reply is edited by its
 * author while they can edit the article, and deleted by its author or the article's owner
 */
export const repliesRepo: Repo<ReplyCreate, MessageReplyUpdate, MessageReply, MessageReplyFilter, MessageReply> = {
  async list(ctx, page, filter) {
    const found = await messageWithAccess(ctx, filter.messageId)
    if (!found) throw notFound('Message not found')
    const params = page ?? { limit: 20, cursor: null }
    return toRepliesPage(await repliesQuery(ctx, filter.messageId, params), params, found.access, found.me)
  },

  async get(ctx, id) {
    const found = await replyWithAccess(ctx, id)
    return found ? toReply(found.row, found.author, found.access, found.me) : null
  },

  async create(ctx, input) {
    const found = await messageWithAccess(ctx, input.messageId)
    if (!found) throw notFound('Message not found')
    if (!canEdit(found.access)) throw forbidden('Only the article\'s editors reply to its messages')
    const row = await ctx.db.insert(messageReplies).values({ messageId: input.messageId, userId: found.me, content: input.content }).returning().get()
    return toReply(row, me(ctx), found.access, found.me)
  },

  async update(ctx, id, input) {
    const found = await replyWithAccess(ctx, id)
    if (!found) return null
    if (!toReply(found.row, found.author, found.access, found.me).can.edit) throw forbidden()
    const row = await ctx.db.update(messageReplies).set({ content: input.content }).where(eq(messageReplies.id, id)).returning().get()
    return row ? toReply(row, found.author, found.access, found.me) : null
  },

  async remove(ctx, id) {
    const found = await replyWithAccess(ctx, id)
    if (!found) return false
    if (!toReply(found.row, found.author, found.access, found.me).can.remove) throw forbidden()
    const gone = await ctx.db.delete(messageReplies).where(eq(messageReplies.id, id)).returning({ id: messageReplies.id }).get()
    return gone !== undefined
  },
}
