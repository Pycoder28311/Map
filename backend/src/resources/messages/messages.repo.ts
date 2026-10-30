import type { ItemAccess, Message, MessageFilter, MessageImport, MessageUpdate, Role } from '@map/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { articles, messages, objectRights, user } from '../../db/schema'
import { accessFrom, accessOf, canEdit } from '../../lib/access'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { forbidden, HttpError, notFound } from '../../lib/errors'
import { beforeCursor, fetchLimit, toPage, type PageParams } from '../../lib/pagination'
import { inParts } from '../../lib/relations'

type Row = typeof messages.$inferSelect
type AuthorRow = { name: string | null; image: string | null }
type MessageCreate = { articleId: number; title: string; content: string }

/** What the caller may do with a message: edit its text (its author, while they can edit the article), Done and delete (its author, the article's editors and owner) */
function canOf(row: Row, access: ItemAccess, me: string): Message['can'] {
  const mine = row.userId === me
  return { edit: mine && canEdit(access), done: mine || canEdit(access), remove: mine || canEdit(access) }
}

function toMessage(row: Row, author: AuthorRow | null, access: ItemAccess, me: string): Message {
  return {
    id: row.id,
    articleId: row.articleId,
    author: row.userId && author?.name != null ? { id: row.userId, name: author.name, image: author.image } : null,
    title: row.title,
    content: row.content,
    done: row.doneAt !== null,
    doneAt: row.doneAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    can: canOf(row, access, me),
  }
}

/**
 * A message with its author and what the caller may do with it, in one query: the message (primary key), its article (primary key),
 * the caller's right on the article (unique index) and the author (primary key). null when it is gone or the caller can't read the article
 */
async function messageWithAccess(ctx: Ctx, id: number) {
  const me = userId(ctx)
  const found = await ctx.db
    .select({
      message: messages,
      owner: articles.userId,
      archived: articles.archived,
      visibility: articles.visibility,
      role: objectRights.role,
      name: user.name,
      image: user.image,
    })
    .from(messages)
    .innerJoin(articles, eq(articles.id, messages.articleId))
    .leftJoin(objectRights, and(eq(objectRights.objectType, 'articles'), eq(objectRights.objectId, articles.id), eq(objectRights.userId, me)))
    .leftJoin(user, eq(user.id, messages.userId))
    .where(eq(messages.id, id))
    .get()
  if (!found) return null
  const access = accessFrom({ userId: found.owner, archived: found.archived, visibility: found.visibility }, me, found.role as Role | null)
  return access ? { row: found.message, author: { name: found.name, image: found.image }, access, me } : null
}

/** The article, when the caller can edit it (they write and list its messages); 404 otherwise */
async function editableArticle(ctx: Ctx, articleId: number) {
  const found = await accessOf(ctx, 'articles', articles, articleId)
  if (!found || !canEdit(found.access)) throw notFound('Article not found')
  return found
}

/** The signed-in user as a message's author (from the session: no read) */
const me = (ctx: Ctx): AuthorRow => ({ name: ctx.user?.name ?? '', image: ctx.user?.image ?? null })

/**
 * An article's messages (docs/plans/34): read one at a time, when their words are clicked. Only the article's editors and owner write
 * them; everyone who can read the article reads them. `list` is "Not in the text": the article's messages whose ids the text does not
 * have, newest first, for its editors
 */
export const messagesRepo: Repo<MessageCreate, MessageUpdate, Message, MessageFilter, Message> = {
  async list(ctx, page: PageParams | null, filter) {
    const { access } = await editableArticle(ctx, filter.articleId)
    const rows = await ctx.db
      .select({ message: messages, name: user.name, image: user.image })
      .from(messages)
      .leftJoin(user, eq(user.id, messages.userId))
      .where(
        and(
          eq(messages.articleId, filter.articleId),
          // The ids as one JSON value (up to 500 of them: D1 binds at most 100 values in a statement)
          filter.exclude.length > 0 ? sql`${messages.id} NOT IN (SELECT value FROM json_each(${JSON.stringify(filter.exclude)}))` : undefined,
          beforeCursor(messages.id, page),
        ),
      )
      .orderBy(desc(messages.id))
      .limit(fetchLimit(page) ?? -1)
    const result = toPage(rows, page, (r) => r.message.id)
    return { items: result.items.map((r) => toMessage(r.message, r, access, userId(ctx))), nextCursor: result.nextCursor }
  },

  async get(ctx, id) {
    const found = await messageWithAccess(ctx, id)
    return found ? toMessage(found.row, found.author, found.access, found.me) : null
  },

  async create(ctx, input) {
    const { access } = await editableArticle(ctx, input.articleId)
    const row = await ctx.db
      .insert(messages)
      .values({ articleId: input.articleId, userId: userId(ctx), title: input.title, content: input.content })
      .returning()
      .get()
    return toMessage(row, me(ctx), access, userId(ctx))
  },

  async update(ctx, id, input) {
    const found = await messageWithAccess(ctx, id)
    if (!found) return null
    const can = canOf(found.row, found.access, found.me)
    const text = input.title !== undefined || input.content !== undefined
    if ((text && !can.edit) || (input.done !== undefined && !can.done)) throw forbidden()
    // A message is never left without both (the table's CHECK): the field not sent keeps its value
    if (text && (input.title ?? found.row.title) === '' && (input.content ?? found.row.content).trim() === '') {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'title', message: 'Needs a title or a text' }])
    }
    const changes = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.done === true ? { doneBy: found.me, doneAt: new Date() } : input.done === false ? { doneBy: null, doneAt: null } : {}),
    }
    if (Object.keys(changes).length === 0) return toMessage(found.row, found.author, found.access, found.me)
    const row = await ctx.db.update(messages).set(changes).where(eq(messages.id, id)).returning().get()
    return row ? toMessage(row, found.author, found.access, found.me) : null
  },

  async remove(ctx, id) {
    const found = await messageWithAccess(ctx, id)
    if (!found) return false
    if (!canOf(found.row, found.access, found.me).remove) throw forbidden()
    const gone = await ctx.db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id }).get()
    return gone !== undefined
  },
}

/** The article's old messages (title and text in their links) made into rows by its editor, in their order: the new messages */
export async function importMessages(ctx: Ctx, input: MessageImport & { items: { title: string; content: string }[] }): Promise<Message[]> {
  const { access } = await editableArticle(ctx, input.articleId)
  const author = userId(ctx)
  const rows = input.items.map((item) => ({ articleId: input.articleId, userId: author, title: item.title, content: item.content }))
  // One INSERT per part that D1 can bind (a row binds 6 values), all in one batch: all made, or none
  const [first, ...rest] = inParts(rows, 8).map((part) => ctx.db.insert(messages).values(part).returning())
  const made = (await ctx.db.batch([first, ...rest])).flat()
  // Ids grow in insert order: sorted, they are in the items' order
  return made.sort((a, b) => a.id - b.id).map((row) => toMessage(row, me(ctx), access, author))
}
