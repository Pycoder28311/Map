import { DATA, messageFilter, messageInput, messageReplyInput, messageReplyUpdate, messageUpdate, type Message } from '@map/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { give, newUser, sqlite } from '../../lib/ownedRepo.suite'
import { importMessages, messagesRepo as repo } from './messages.repo'
import { repliesRepo } from './replies.repo'

const articles = ownedRepo(schema.articles, DATA.articles)
const newArticle = async (owner: Ctx) => (await articles.create(owner, DATA.articles.input.parse({ title: 'A' }) as never)).id as number
const create = (ctx: Ctx, body: Record<string, unknown>) => repo.create(ctx, messageInput.parse(body))
const update = (ctx: Ctx, id: number, body: Record<string, unknown>) => repo.update(ctx, id, messageUpdate.parse(body))
const notInText = (ctx: Ctx, query: Record<string, string>, limit = 20, cursor: string | null = null) =>
  repo.list(ctx, { limit, cursor }, messageFilter.parse(query))

async function status(promise: Promise<unknown>): Promise<number> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error.status
    throw error
  }
  return 200
}

/** An article with its owner, an editor, a reader and someone without a right */
async function setup() {
  const owner = newUser('Owner')
  const editor = newUser('Eddie')
  const reader = newUser('Rita')
  const stranger = newUser()
  const article = await newArticle(owner)
  await give(owner, 'articles', article, editor, 'editor')
  await give(owner, 'articles', article, reader, 'reader')
  return { owner, editor, reader, stranger, article }
}

describe('messages', () => {
  it('the owner and editors write them; readers and strangers cannot', async () => {
    const { owner, editor, reader, stranger, article } = await setup()
    const mine = await create(owner, { articleId: article, title: 'Hi' })
    expect(mine).toMatchObject({ articleId: article, title: 'Hi', content: '', done: false, author: { name: 'Owner' } })
    expect(await create(editor, { articleId: article, content: 'Note' })).toMatchObject({ author: { name: 'Eddie' }, can: { edit: true, done: true, remove: true, reply: true } })
    expect(await status(create(reader, { articleId: article, title: 'x' }))).toBe(404)
    expect(await status(create(stranger, { articleId: article, title: 'x' }))).toBe(404)
  })

  it('everyone who can read the article reads one; others get nothing', async () => {
    const { owner, reader, stranger, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'Hi', content: 'There' })
    const seen = (await repo.get(reader, id)) as Message
    expect(seen).toMatchObject({ id, title: 'Hi', content: 'There', author: { name: 'Owner' }, can: { edit: false, done: false, remove: false, reply: false }, replies: [], repliesCursor: null })
    expect(await repo.get(stranger, id)).toBeNull()
    expect(await repo.get(reader, id + 1000)).toBeNull()
  })

  it('only its author edits its text; editors, the owner and the author mark it Done and undo it', async () => {
    const { owner, editor, reader, article } = await setup()
    const { id } = await create(editor, { articleId: article, title: 'Mine' })
    expect(await status(update(owner, id, { title: 'x' }))).toBe(403)
    expect(await status(update(reader, id, { done: true }))).toBe(403)
    expect(await update(editor, id, { content: 'More' })).toMatchObject({ title: 'Mine', content: 'More' })
    const done = (await update(owner, id, { done: true })) as Message
    expect(done.done).toBe(true)
    expect(done.doneAt).not.toBeNull()
    expect(await update(editor, id, { done: false })).toMatchObject({ done: false, doneAt: null })
  })

  it('an edit never leaves it without both title and text', async () => {
    const { owner, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'Only a title' })
    expect(await status(update(owner, id, { title: '' }))).toBe(400)
    expect(await update(owner, id, { title: '', content: 'Now a text' })).toMatchObject({ title: '', content: 'Now a text' })
  })

  it('an author who lost edit access can no longer edit it, but can still mark it Done or delete it', async () => {
    const { owner, editor, article } = await setup()
    const { id } = await create(editor, { articleId: article, title: 'Mine' })
    await owner.db.update(schema.objectRights).set({ role: 'reader' }).where(eq(schema.objectRights.userId, editor.user!.id))
    expect(await status(update(editor, id, { title: 'x' }))).toBe(403)
    expect(await update(editor, id, { done: true })).toMatchObject({ done: true })
    expect(await repo.remove(editor, id)).toBe(true)
  })

  it('deleting: its author and the article\'s owner; not the other editors, nor readers (docs/plans/37)', async () => {
    const { owner, editor, reader, stranger, article } = await setup()
    const a = await create(owner, { articleId: article, title: 'a' })
    const b = await create(editor, { articleId: article, title: 'b' })
    const c = await create(editor, { articleId: article, title: 'c' })
    expect(await status(repo.remove(reader, a.id))).toBe(403)
    expect(await repo.remove(stranger, a.id)).toBe(false)
    expect(await status(repo.remove(editor, a.id))).toBe(403)
    expect(((await repo.get(editor, a.id)) as Message).can).toMatchObject({ done: true, remove: false })
    expect(await repo.remove(editor, b.id)).toBe(true)
    expect(await repo.remove(owner, c.id)).toBe(true)
    expect(await repo.remove(owner, a.id)).toBe(true)
    expect(await repo.get(owner, a.id)).toBeNull()
  })

  it('"Not in the text": the article\'s messages but the given ids, newest first, a page at a time; editors only', async () => {
    const { owner, editor, reader, article } = await setup()
    const other = await newArticle(owner)
    const ids: number[] = []
    for (const n of [1, 2, 3, 4, 5]) ids.push((await create(owner, { articleId: article, title: `m${n}` })).id)
    await create(owner, { articleId: other, title: 'elsewhere' })
    const first = await notInText(editor, { articleId: String(article), exclude: `${ids[1]},${ids[3]}` }, 2)
    expect(first.items.map((m) => m.title)).toEqual(['m5', 'm3'])
    const second = await notInText(editor, { articleId: String(article), exclude: `${ids[1]},${ids[3]}` }, 2, first.nextCursor)
    expect(second.items.map((m) => m.title)).toEqual(['m1'])
    expect(second.nextCursor).toBeNull()
    expect(await status(notInText(reader, { articleId: String(article) }))).toBe(404)
  })

  it('a deleted author shows as nobody; a deleted article takes its messages', async () => {
    const { owner, editor, article } = await setup()
    const { id } = await create(editor, { articleId: article, title: 'Bye' })
    sqlite.prepare('DELETE FROM user WHERE id = ?').run(editor.user!.id)
    expect(await repo.get(owner, id)).toMatchObject({ author: null, title: 'Bye' })
    await articles.remove(owner, article)
    expect(await repo.get(owner, id)).toBeNull()
  })

  it('a message of an article in the Trash is its owner\'s only', async () => {
    const { owner, editor, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'x' })
    await articles.update(owner, article, DATA.articles.update.parse({ archived: true }) as never)
    expect(await repo.get(editor, id)).toBeNull()
    expect(await status(create(editor, { articleId: article, title: 'y' }))).toBe(404)
    expect(await repo.get(owner, id)).not.toBeNull()
  })

  it('imports old messages in their order, editors only', async () => {
    const { editor, reader, article } = await setup()
    const made = await importMessages(editor, { articleId: article, items: [{ title: 'a', content: '' }, { title: '', content: 'b' }] })
    expect(made.map((m) => [m.title, m.content])).toEqual([
      ['a', ''],
      ['', 'b'],
    ])
    expect(made[0].id).toBeLessThan(made[1].id)
    expect(await status(importMessages(reader, { articleId: article, items: [{ title: 'a', content: '' }] }))).toBe(404)
  })

  it('stays within D1\'s 100 variables: 50 old messages at once, and "Not in the text" leaving out 500 ids', async () => {
    const { owner, article } = await setup()
    const items = Array.from({ length: 50 }, (_, n) => ({ title: `t${n}`, content: 'x'.repeat(50) }))
    const made = await importMessages(owner, { articleId: article, items })
    expect(made.map((m) => m.title)).toEqual(items.map((i) => i.title))
    const exclude = [...made.slice(1).map((m) => m.id), ...Array.from({ length: 451 }, (_, n) => 1_000_000 + n)]
    const page = await notInText(owner, { articleId: String(article), exclude: exclude.join(',') })
    expect(page.items.map((m) => m.title)).toEqual(['t0'])
  })
})

describe('message replies (docs/plans/37)', () => {
  const reply = (ctx: Ctx, messageId: number, content: string) => repliesRepo.create(ctx, messageReplyInput.parse({ messageId, content }))
  const edit = (ctx: Ctx, id: number, content: string) => repliesRepo.update(ctx, id, messageReplyUpdate.parse({ content }))
  const earlier = (ctx: Ctx, messageId: number, cursor: string | null, limit = 20) => repliesRepo.list(ctx, { limit, cursor }, { messageId })

  it('editors and the owner write them; readers read them, and cannot write', async () => {
    const { owner, editor, reader, stranger, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'Hi' })
    expect(await reply(editor, id, ' Yes ')).toMatchObject({ messageId: id, content: 'Yes', author: { name: 'Eddie' }, can: { edit: true, remove: true } })
    expect(await status(reply(reader, id, 'x'))).toBe(403)
    expect(await status(reply(stranger, id, 'x'))).toBe(404)
    expect(() => messageReplyInput.parse({ messageId: id, content: '   ' })).toThrow()
    const seen = (await repo.get(reader, id)) as Message
    expect(seen.can.reply).toBe(false)
    expect(seen.replies).toMatchObject([{ content: 'Yes', author: { name: 'Eddie' }, can: { edit: false, remove: false } }])
  })

  it('come with the message, the newest 20 first; the earlier ones a page at a time', async () => {
    const { owner, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'Hi' })
    for (let n = 1; n <= 25; n++) await reply(owner, id, `r${n}`)
    const message = (await repo.get(owner, id)) as Message
    expect(message.replies!.map((r) => r.content)).toEqual(Array.from({ length: 20 }, (_, n) => `r${25 - n}`))
    const page = await earlier(owner, id, message.repliesCursor!)
    expect(page.items.map((r) => r.content)).toEqual(['r5', 'r4', 'r3', 'r2', 'r1'])
    expect(page.nextCursor).toBeNull()
  })

  it('edited by its author while they edit the article; deleted by its author or the owner', async () => {
    const { owner, editor, reader, article } = await setup()
    const second = newUser('Ed2')
    await give(owner, 'articles', article, second, 'editor')
    const { id } = await create(owner, { articleId: article, title: 'Hi' })
    const mine = await reply(editor, id, 'a')
    expect(await status(edit(owner, mine.id, 'x'))).toBe(403)
    expect(await edit(editor, mine.id, 'b')).toMatchObject({ content: 'b' })
    expect(await status(repliesRepo.remove(second, mine.id))).toBe(403)
    expect(await status(repliesRepo.remove(reader, mine.id))).toBe(403)
    expect(await repliesRepo.remove(owner, mine.id)).toBe(true)
    const other = await reply(editor, id, 'c')
    await owner.db.update(schema.objectRights).set({ role: 'reader' }).where(eq(schema.objectRights.userId, editor.user!.id))
    expect(await status(edit(editor, other.id, 'x'))).toBe(403)
    expect(await repliesRepo.remove(editor, other.id)).toBe(true)
  })

  it('go with their message', async () => {
    const { owner, article } = await setup()
    const { id } = await create(owner, { articleId: article, title: 'Hi' })
    const r = await reply(owner, id, 'a')
    await repo.remove(owner, id)
    expect(await repliesRepo.get(owner, r.id)).toBeNull()
    expect(sqlite.prepare('SELECT count(*) AS n FROM message_replies WHERE id = ?').all(r.id)[0]).toEqual({ n: 0 })
  })
})
