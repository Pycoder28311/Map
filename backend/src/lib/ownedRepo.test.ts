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
