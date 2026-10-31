import { DATA, TABLE_NAMES } from '@map/shared'
import * as schema from '../db/schema'
import { ownedRepo } from './ownedRepo'
import { describe, expect, it } from 'vitest'
import { describeOwnedRepo, give, newUser } from './ownedRepo.suite'
import { toHref } from '@map/shared'
import type { Ctx } from './crud'

// Every table of the data config passes the same tests (ownedRepo.suite.ts)
for (const name of TABLE_NAMES) describeOwnedRepo(name, ownedRepo(schema[name], DATA[name]) as never)

describe('articles: the Info box', () => {
  const repo = ownedRepo(schema.articles, DATA.articles)
  it('saves and reads back every kind of row', async () => {
    const ctx = newUser()
    const row = await repo.create(ctx, DATA.articles.input.parse({ title: 'Ada' }) as never)
    const box = {
      image: null,
      banner: null,
      name: 'Ada Lovelace',
      rows: [
        { id: 'a', label: 'Born', kind: 'value', value: '1815' },
        { id: 'b', label: 'Works', kind: 'list', items: ['Notes'], ordered: false },
        { id: 'c', label: 'About', kind: 'text', text: 'x', bullets: false },
      ],
    }
    await repo.update(ctx, row.id as number, DATA.articles.update.parse({ infobox: box }) as never)
    expect((await repo.get(ctx, row.id as number))?.infobox).toEqual(box)
  })
})

describe('articles: the autolinkers', () => {
  const repo = ownedRepo(schema.articles, DATA.articles)
  const rule = (id: string, phrases: string[]) => ({ id, phrases, link: toHref({ kind: 'object', type: 'article', id: '7' }), by: 'someone' })
  const update = (ctx: Ctx, id: number, body: Record<string, unknown>) => repo.update(ctx, id, DATA.articles.update.parse(body) as never)

  it('start empty, are saved with the article and read back; a list leaves them out', async () => {
    const ctx = newUser()
    const row = await repo.create(ctx, DATA.articles.input.parse({ title: 'A' }) as never)
    expect(row.autolinkers).toEqual([])
    const saved = await update(ctx, row.id as number, { autolinkers: [rule('r1', ['Athens', 'Athina'])], content: '<p>Athens</p>' })
    expect(saved).toMatchObject({ autolinkers: [rule('r1', ['Athens', 'Athina'])], version: 1 })
    expect((await repo.get(ctx, row.id as number))?.autolinkers).toEqual([rule('r1', ['Athens', 'Athina'])])
    const { items } = await repo.list(ctx, { limit: 20, cursor: null }, DATA.articles.filter.parse({}) as never)
    expect(items).toHaveLength(1)
    expect(items[0]).not.toHaveProperty('autolinkers')
    expect(items[0]).toHaveProperty('infobox')
  })

  it('an editor gets and saves them; a reader\'s copy has none', async () => {
    const owner = newUser()
    const row = await repo.create(owner, DATA.articles.input.parse({ title: 'A' }) as never)
    const id = row.id as number
    await update(owner, id, { autolinkers: [rule('r1', ['x'])] })
    const editor = newUser()
    const reader = newUser()
    await give(owner, 'articles', id, editor, 'editor')
    await give(owner, 'articles', id, reader, 'reader')
    expect((await repo.get(editor, id))?.autolinkers).toEqual([rule('r1', ['x'])])
    expect(await repo.get(reader, id)).not.toHaveProperty('autolinkers')
    expect(await update(editor, id, { autolinkers: [rule('r1', ['x']), rule('r2', ['y'])], baseVersion: 1 })).toMatchObject({ version: 2 })
    expect((await repo.get(owner, id))?.autolinkers).toHaveLength(2)
  })

  it('refuses autolinkers that are not valid, before the repo (the contract)', () => {
    expect(DATA.articles.update.safeParse({ autolinkers: [rule('a', ['x']), rule('b', ['X'])] }).success).toBe(false)
    expect(DATA.articles.update.safeParse({ autolinkers: [{ ...rule('a', ['x']), link: 'javascript:alert(1)' }] }).success).toBe(false)
  })
})

describe('notes: attached to one thing (docs/plans/38)', () => {
  const notes = ownedRepo(schema.notes, DATA.notes)
  const maps = ownedRepo(schema.maps, DATA.maps)
  const articles = ownedRepo(schema.articles, DATA.articles)
  const note = async (ctx: Ctx, title: string) => (await notes.create(ctx, DATA.notes.input.parse({ title }) as never)).id as number
  const attach = (ctx: Ctx, id: number, attachedType: string | null, attachedId: number | null, attachedNode: number | null = null) =>
    notes.update(ctx, id, DATA.notes.update.parse({ attachedType, attachedId, attachedNode }) as never)
  const list = async (ctx: Ctx, filter: Record<string, string>) =>
    (await notes.list(ctx, { limit: 50, cursor: null }, DATA.notes.filter.parse(filter) as never)).items.map((n) => n.title)

  it('attaches to the user\'s map, a node of it or an article they can read; the list finds them by what they are attached to', async () => {
    const ctx = newUser()
    const map = (await maps.create(ctx, DATA.maps.input.parse({ title: 'M' }) as never)).id as number
    const article = (await articles.create(ctx, DATA.articles.input.parse({ title: 'A' }) as never)).id as number
    const [a, b, c] = [await note(ctx, 'a'), await note(ctx, 'b'), await note(ctx, 'c')]
    expect(await attach(ctx, a, 'map', map)).toMatchObject({ attachedType: 'map', attachedId: map, attachedNode: null })
    await attach(ctx, b, 'map', map, 7)
    await attach(ctx, c, 'article', article)
    expect((await list(ctx, { attachedType: 'map', attachedId: String(map) })).sort()).toEqual(['a', 'b'])
    expect(await list(ctx, { attachedType: 'map', attachedId: String(map), attachedNode: 'none' })).toEqual(['a'])
    expect(await list(ctx, { attachedType: 'map', attachedId: String(map), attachedNode: '7' })).toEqual(['b'])
    expect(await list(ctx, { attachedType: 'article', attachedId: String(article) })).toEqual(['c'])
    // Moved: one thing at a time
    await attach(ctx, b, 'article', article)
    expect((await list(ctx, { attachedType: 'article', attachedId: String(article) })).sort()).toEqual(['b', 'c'])
    await attach(ctx, c, null, null)
    expect(await list(ctx, { attachedType: 'article', attachedId: String(article) })).toEqual(['b'])
  })

  it('refuses a map or article the user can\'t see, and an unknown kind', async () => {
    const ctx = newUser()
    const other = newUser()
    const theirs = (await maps.create(other, DATA.maps.input.parse({ title: 'M' }) as never)).id as number
    const theirArticle = (await articles.create(other, DATA.articles.input.parse({ title: 'A' }) as never)).id as number
    const id = await note(ctx, 'n')
    await expect(attach(ctx, id, 'map', theirs)).rejects.toMatchObject({ status: 400, code: 'UNKNOWN_REFERENCE' })
    await expect(attach(ctx, id, 'article', theirArticle)).rejects.toMatchObject({ status: 400 })
    // A shared article they can read is fine
    await give(other, 'articles', theirArticle, ctx, 'reader')
    expect(await attach(ctx, id, 'article', theirArticle)).toMatchObject({ attachedId: theirArticle })
  })

  it('deleting the map or article leaves its notes as they are', async () => {
    const ctx = newUser()
    const map = (await maps.create(ctx, DATA.maps.input.parse({ title: 'M' }) as never)).id as number
    const id = await note(ctx, 'kept')
    await attach(ctx, id, 'map', map, 3)
    await maps.remove(ctx, map)
    expect(await notes.get(ctx, id)).toMatchObject({ title: 'kept', attachedType: 'map', attachedId: map, attachedNode: 3 })
  })

  it('only the owner moves a note: an editor of a shared note can\'t, and others don\'t see where it is', async () => {
    const owner = newUser()
    const editor = newUser()
    const id = await note(owner, 'n')
    const map = (await maps.create(owner, DATA.maps.input.parse({ title: 'M' }) as never)).id as number
    await attach(owner, id, 'map', map)
    await give(owner, 'notes', id, editor, 'editor')
    await expect(notes.update(editor, id, DATA.notes.update.parse({ attachedType: null, attachedId: null, attachedNode: null, baseVersion: 0 }) as never)).rejects.toMatchObject({ status: 403 })
    expect(await notes.get(editor, id)).not.toHaveProperty('attachedType')
  })
})
