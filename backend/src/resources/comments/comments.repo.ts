import { COMMENT_DEPTH, type Comment, type CommentFilter, type CommentUpdate, type ItemAccess, type Role } from '@map/shared'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { articles, comments, objectRights, user } from '../../db/schema'
import { accessFrom, accessOf } from '../../lib/access'
import { userId, type Ctx, type Repo } from '../../lib/crud'
import { forbidden, HttpError, notFound } from '../../lib/errors'
import { afterCursor, beforeCursor, fetchLimit, toPage } from '../../lib/pagination'

type Row = typeof comments.$inferSelect
type AuthorRow = { name: string | null; image: string | null }
type CommentCreate = { articleId: number; parentId?: number; content: string }

function toComment(row: Row, author: AuthorRow | null, access: ItemAccess, me: string): Comment {
  const mine = row.userId === me
  return {
    id: row.id,
    articleId: row.articleId,
    parentId: row.parentId,
    depth: row.depth,
    author: row.userId && author?.name != null ? { id: row.userId, name: author.name, image: author.image } : null,
    content: row.content,
    replyCount: row.replyCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    edited: row.updatedAt.getTime() > row.createdAt.getTime(),
    can: { edit: mine, remove: mine || access === 'owner' },
  }
}

/** The signed-in user as a comment's author (from the session: no read) */
const me = (ctx: Ctx): AuthorRow => ({ name: ctx.user?.name ?? '', image: ctx.user?.image ?? null })

/** The article and the caller's right on it (not run: it goes in a batch with the page it guards) */
const articleAccessQuery = (ctx: Ctx, articleId: number) =>
  ctx.db
    .select({ userId: articles.userId, archived: articles.archived, visibility: articles.visibility, role: objectRights.role })
    .from(articles)
    .leftJoin(objectRights, and(eq(objectRights.objectType, 'articles'), eq(objectRights.objectId, articles.id), eq(objectRights.userId, userId(ctx))))
    .where(eq(articles.id, articleId))
    .limit(1)

/**
 * A comment and the caller's access to its article, in one query: the comment (primary key), its article (primary key) and the caller's
 * right on it (unique index). No author: only its author edits it (they are the session). null when it is gone or not readable
 */
async function commentWithAccess(ctx: Ctx, id: number) {
  const me = userId(ctx)
  const found = await ctx.db
    .select({ comment: comments, owner: articles.userId, archived: articles.archived, visibility: articles.visibility, role: objectRights.role })
    .from(comments)
    .innerJoin(articles, eq(articles.id, comments.articleId))
    .leftJoin(objectRights, and(eq(objectRights.objectType, 'articles'), eq(objectRights.objectId, articles.id), eq(objectRights.userId, me)))
    .where(eq(comments.id, id))
    .get()
  if (!found) return null
  const access = accessFrom({ userId: found.owner, archived: found.archived, visibility: found.visibility }, me, found.role as Role | null)
  return access ? { row: found.comment, access, me } : null
}

/** 10 comments a minute per person (the COMMENTS binding, wrangler.jsonc): no database read */
async function rateLimit(ctx: Ctx) {
  const { success } = await ctx.env.COMMENTS.limit({ key: userId(ctx) })
  if (!success) throw new HttpError(429, 'TOO_MANY_REQUESTS', 'Too many comments. Please wait a minute and try again.')
}

// Where a reply goes: under the comment it answers, or, when that one is at the last level, under its parent (at the last level too)
const placedUnder = sql`CASE WHEN ${comments.depth} >= ${COMMENT_DEPTH} THEN ${comments.parentId} ELSE ${comments.id} END`
const parentRow = (articleId: number, parentId: number) => and(eq(comments.id, parentId), eq(comments.articleId, articleId))

/**
 * Comments below an article (docs/plans/37): everyone who can read the article reads and writes them. A reply is a comment with a
 * parent, up to COMMENT_DEPTH levels. `list` is one level, a page at a time: the top comments newest first, or a comment's replies
 * (`parentId`) oldest first. A comment is edited by its author while they can read the article, and deleted (with every level under
 * it) by its author or the article's owner
 */
export const commentsRepo: Repo<CommentCreate, CommentUpdate, Comment, CommentFilter, Comment> = {
  async list(ctx, page, filter) {
    const top = filter.parentId === undefined
    const level = top ? isNull(comments.parentId) : eq(comments.parentId, filter.parentId!)
    const pageQuery = ctx.db
      .select({ comment: comments, name: user.name, image: user.image })
      .from(comments)
      .leftJoin(user, eq(user.id, comments.userId))
      // Through comments_article_idx (article_id, parent_id, id)
      .where(and(eq(comments.articleId, filter.articleId), level, top ? beforeCursor(comments.id, page) : afterCursor(comments.id, page)))
      .orderBy(top ? desc(comments.id) : asc(comments.id))
      .limit(fetchLimit(page) ?? -1)
    // The article's access and the page in one batch: the page is thrown away when the caller can't read the article
    const [found, rows] = await ctx.db.batch([articleAccessQuery(ctx, filter.articleId), pageQuery])
    const me = userId(ctx)
    const access = found[0] ? accessFrom(found[0], me, found[0].role as Role | null) : null
    if (!access) throw notFound('Article not found')
    const result = toPage(rows, page, (r) => r.comment.id)
    return { items: result.items.map((r) => toComment(r.comment, r, access, me)), nextCursor: result.nextCursor }
  },

  async get(ctx, id) {
    const found = await commentWithAccess(ctx, id)
    if (!found) return null
    const author = found.row.userId ? await ctx.db.select({ name: user.name, image: user.image }).from(user).where(eq(user.id, found.row.userId)).get() : null
    return toComment(found.row, author ?? null, found.access, found.me)
  },

  async create(ctx, input) {
    await rateLimit(ctx)
    const found = await accessOf(ctx, 'articles', articles, input.articleId)
    if (!found) throw notFound('Article not found')
    const author = userId(ctx)
    if (input.parentId === undefined) {
      const row = await ctx.db.insert(comments).values({ articleId: input.articleId, userId: author, content: input.content }).returning().get()
      return toComment(row, me(ctx), found.access, author)
    }
    // A reply: made from its parent's row, and the parent's count goes up, in one batch, with no read of the parent first. Nothing
    // made: the parent is not a comment of this article
    const now = new Date()
    const [made] = await ctx.db.batch([
      ctx.db
        .insert(comments)
        .select(
          ctx.db
            // Every column, in the table's order (drizzle's insert … select needs them all); a NULL id is a new one
            .select({
              id: sql`NULL`.as('id'),
              articleId: comments.articleId,
              userId: sql`${author}`.as('user_id'),
              parentId: sql`${placedUnder}`.as('parent_id'),
              depth: sql`min(${comments.depth} + 1, ${COMMENT_DEPTH})`.as('depth'),
              content: sql`${input.content}`.as('content'),
              replyCount: sql`0`.as('reply_count'),
              createdAt: sql`${Math.floor(now.getTime() / 1000)}`.as('created_at'),
              updatedAt: sql`${Math.floor(now.getTime() / 1000)}`.as('updated_at'),
            })
            .from(comments)
            .where(parentRow(input.articleId, input.parentId)),
        )
        .returning(),
      ctx.db
        .update(comments)
        // (updated_at kept: a reply does not make its parent "edited")
        .set({ replyCount: sql`${comments.replyCount} + 1`, updatedAt: sql`${comments.updatedAt}` })
        .where(eq(comments.id, sql`(SELECT ${placedUnder} FROM ${comments} WHERE ${parentRow(input.articleId, input.parentId)})`)),
    ])
    if (made.length === 0) throw new HttpError(400, 'UNKNOWN_REFERENCE', 'Unknown parentId', [{ path: 'parentId', message: 'Not found' }])
    return toComment(made[0], me(ctx), found.access, author)
  },

  async update(ctx, id, input) {
    const found = await commentWithAccess(ctx, id)
    if (!found) return null
    if (found.row.userId !== found.me) throw forbidden()
    const row = await ctx.db
      .update(comments)
      .set({ content: input.content })
      .where(and(eq(comments.id, id), eq(comments.userId, found.me)))
      .returning()
      .get()
    return row ? toComment(row, me(ctx), found.access, found.me) : null
  },

  async remove(ctx, id) {
    const found = await commentWithAccess(ctx, id)
    if (!found) return false
    if (!toComment(found.row, null, found.access, found.me).can.remove) throw forbidden()
    // Every level under it goes with it (the foreign key); its parent has one reply less
    const parent = found.row.parentId
    const [gone] = await ctx.db.batch([
      ctx.db.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id }),
      ...(parent !== null
        ? [ctx.db.update(comments).set({ replyCount: sql`max(${comments.replyCount} - 1, 0)`, updatedAt: sql`${comments.updatedAt}` }).where(eq(comments.id, parent))]
        : []),
    ])
    return gone.length > 0
  },
}
