import { commentInput, commentUpdate, DATA, type Comment } from '@map/shared'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { give, newUser, sqlite } from '../../lib/ownedRepo.suite'
import { commentsRepo as repo } from './comments.repo'

const articles = ownedRepo(schema.articles, DATA.articles)

/** A user whose COMMENTS limiter lets `allowed` comments through (as the binding does, per person) */
function person(name?: string, allowed = 1000): Ctx {
  const ctx = newUser(name)
  let left = allowed
  return { ...ctx, env: { COMMENTS: { limit: async () => ({ success: left-- > 0 }) } } as unknown as CloudflareBindings }
}
const newArticle = async (owner: Ctx) => (await articles.create(owner, DATA.articles.input.parse({ title: 'A' }) as never)).id as number
const post = (ctx: Ctx, articleId: number, content: string, parentId?: number) => repo.create(ctx, commentInput.parse({ articleId, content, parentId }))
const edit = (ctx: Ctx, id: number, content: string) => repo.update(ctx, id, commentUpdate.parse({ content }))
const page = (ctx: Ctx, articleId: number, parentId?: number, cursor: string | null = null, limit = 20) =>
  repo.list(ctx, { limit, cursor }, { articleId, parentId })
const row = (id: number) => sqlite.prepare('SELECT depth, parent_id AS parentId, reply_count AS replyCount FROM comments WHERE id = ?').all(id)[0]

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.status
    throw error
  }
  return 200
}

/** An article with its owner, an editor, two readers and someone without a right */
async function setup() {
  const owner = person('Owner')
  const editor = person('Eddie')
  const reader = person('Rita')
  const other = person('Otto')
  const stranger = person()
  const article = await newArticle(owner)
  await give(owner, 'articles', article, editor, 'editor')
  await give(owner, 'articles', article, reader, 'reader')
  await give(owner, 'articles', article, other, 'reader')
  return { owner, editor, reader, other, stranger, article }
}

describe('comments', () => {
  it('every reader writes them; others cannot', async () => {
    const { reader, stranger, article } = await setup()
    expect(await post(reader, article, ' Hello ')).toMatchObject({ articleId: article, parentId: null, depth: 1, content: 'Hello', replyCount: 0, edited: false, author: { name: 'Rita' }, can: { edit: true, remove: true } })
    expect(await status(post(stranger, article, 'x'))).toBe(404)
    expect(() => commentInput.parse({ articleId: article, content: '  ' })).toThrow()
    expect(() => commentInput.parse({ articleId: article, content: 'x'.repeat(2001) })).toThrow()
  })

  it('top comments newest first, a page at a time; a reply is not one of them', async () => {
    const { owner, reader, article } = await setup()
    const ids: number[] = []
    for (const n of [1, 2, 3]) ids.push((await post(owner, article, `c${n}`)).id)
    await post(reader, article, 'reply', ids[0])
    await post(owner, await newArticle(owner), 'elsewhere')
    const first = await page(reader, article, undefined, null, 2)
    expect(first.items.map((c) => c.content)).toEqual(['c3', 'c2'])
    const second = await page(reader, article, undefined, first.nextCursor, 2)
    expect(second.items.map((c) => [c.content, c.replyCount])).toEqual([['c1', 1]])
    expect(second.nextCursor).toBeNull()
  })

  it('a comment\'s replies oldest first, a page at a time', async () => {
    const { owner, reader, article } = await setup()
    const top = await post(owner, article, 'top')
    for (const n of [1, 2, 3]) await post(reader, article, `r${n}`, top.id)
    const first = await page(owner, article, top.id, null, 2)
    expect(first.items.map((c) => c.content)).toEqual(['r1', 'r2'])
    expect((await page(owner, article, top.id, first.nextCursor, 2)).items.map((c) => c.content)).toEqual(['r3'])
  })

  it('a reply\'s level comes from its parent; a reply to the last level goes under that comment\'s parent', async () => {
    const { owner, reader, article } = await setup()
    let parent = await post(owner, article, 'level 1')
    const chain = [parent]
    for (const depth of [2, 3, 4, 5]) {
      parent = await post(reader, article, `level ${depth}`, parent.id)
      expect(parent).toMatchObject({ depth, parentId: chain[chain.length - 1].id })
      chain.push(parent)
    }
    const deeper = await post(owner, article, '@Rita yes', chain[4].id)
    expect(deeper).toMatchObject({ depth: 5, parentId: chain[3].id })
    expect(row(chain[3].id)).toEqual({ depth: 4, parentId: chain[2].id, replyCount: 2 })
    expect(row(chain[4].id)).toMatchObject({ replyCount: 0 })
  })

  it('a parent of another article, or none, is refused and nothing is written', async () => {
    const { owner, article } = await setup()
    const elsewhere = await post(owner, await newArticle(owner), 'x')
    expect(await repo.create(owner, commentInput.parse({ articleId: article, content: 'r', parentId: elsewhere.id })).catch((e) => e)).toMatchObject({ status: 400, code: 'UNKNOWN_REFERENCE' })
    expect(await status(post(owner, article, 'r', 999999))).toBe(400)
    expect(row(elsewhere.id)).toMatchObject({ replyCount: 0 })
  })

  it('the reply count goes up with a reply and down with its delete; deleting a comment takes every level under it', async () => {
    const { owner, reader, other, article } = await setup()
    const top = await post(owner, article, 'top')
    const a = await post(reader, article, 'a', top.id)
    const b = await post(other, article, 'b', a.id)
    const c = await post(reader, article, 'c', b.id)
    expect(row(top.id)).toMatchObject({ replyCount: 1 })
    expect(await repo.remove(reader, a.id)).toBe(true)
    expect(row(top.id)).toMatchObject({ replyCount: 0 })
    for (const id of [a.id, b.id, c.id]) expect(row(id)).toBeUndefined()
    // A reply leaves its parent not "edited"
    expect(((await page(owner, article)).items[0] as Comment).edited).toBe(false)
  })

  it('only its author edits it, and it then shows "edited"', async () => {
    const { owner, reader, article } = await setup()
    const mine = await post(reader, article, 'first')
    // (dates are whole seconds: the comment is made a minute old)
    sqlite.prepare('UPDATE comments SET created_at = created_at - 60, updated_at = updated_at - 60 WHERE id = ?').run(mine.id)
    expect(await status(edit(owner, mine.id, 'x'))).toBe(403)
    expect(await edit(reader, mine.id, 'second')).toMatchObject({ content: 'second', edited: true, author: { name: 'Rita' } })
  })

  it('deleted by its author or the article\'s owner; not by another reader or an editor', async () => {
    const { owner, editor, reader, other, article } = await setup()
    const a = await post(reader, article, 'a')
    expect(await status(repo.remove(other, a.id))).toBe(403)
    expect(await status(repo.remove(editor, a.id))).toBe(403)
    expect((await page(other, article)).items[0].can).toEqual({ edit: false, remove: false })
    expect((await page(owner, article)).items[0].can).toEqual({ edit: false, remove: true })
    expect(await repo.remove(owner, a.id)).toBe(true)
    const b = await post(reader, article, 'b')
    expect(await repo.remove(reader, b.id)).toBe(true)
    expect(await repo.remove(reader, b.id)).toBe(false)
  })

  it('someone who can no longer read the article can neither edit nor read them', async () => {
    const { owner, reader, article } = await setup()
    const mine = await post(reader, article, 'a')
    sqlite.prepare('DELETE FROM object_rights WHERE user_id = ?').run(reader.user!.id)
    expect(await edit(reader, mine.id, 'x')).toBeNull()
    expect(await status(page(reader, article))).toBe(404)
    expect(await repo.get(owner, mine.id)).toMatchObject({ content: 'a' })
  })

  it('the comments of an article in the Trash are its owner\'s only', async () => {
    const { owner, reader, article } = await setup()
    await post(reader, article, 'a')
    await articles.update(owner, article, DATA.articles.update.parse({ archived: true }) as never)
    expect(await status(page(reader, article))).toBe(404)
    expect(await status(post(reader, article, 'b'))).toBe(404)
    expect((await page(owner, article)).items).toHaveLength(1)
  })

  it('a deleted account shows as nobody; a deleted article takes its comments', async () => {
    const { owner, reader, article } = await setup()
    const a = await post(reader, article, 'a')
    sqlite.prepare('DELETE FROM user WHERE id = ?').run(reader.user!.id)
    expect((await page(owner, article)).items[0]).toMatchObject({ author: null, content: 'a' })
    await articles.remove(owner, article)
    expect(row(a.id)).toBeUndefined()
  })

  it('10 comments a minute per person: then 429, before any database read', async () => {
    const owner = person('Owner', 10)
    const article = await newArticle(owner)
    for (let n = 0; n < 10; n++) await post(owner, article, `c${n}`)
    expect(await status(post(owner, article, 'one more'))).toBe(429)
    expect(await status(post(owner, 999999, 'nowhere'))).toBe(429)
  })
})
