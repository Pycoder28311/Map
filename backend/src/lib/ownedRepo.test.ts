import { DATA, TABLE_NAMES } from '@map/shared'
import * as schema from '../db/schema'
import { ownedRepo } from './ownedRepo'
import { describe, expect, it } from 'vitest'
import { describeOwnedRepo, newUser } from './ownedRepo.suite'

// Every table of the data config passes the same tests (ownedRepo.suite.ts)
for (const name of TABLE_NAMES) describeOwnedRepo(name, ownedRepo(schema[name], DATA[name]) as never)

describe('articles: the Info box', () => {
  const repo = ownedRepo(schema.articles, DATA.articles)
  it('saves and reads back every kind of row', async () => {
    const ctx = newUser()
    const row = await repo.create(ctx, DATA.articles.input.parse({ title: 'Ada' }) as never)
    const box = {
      image: null,
      name: 'Ada Lovelace',
      rows: [
        { id: 'a', label: 'Born', kind: 'value', value: '1815' },
        { id: 'b', label: 'Works', kind: 'list', items: ['Notes'] },
        { id: 'c', label: 'About', kind: 'text', text: 'x', bullets: false },
      ],
    }
    await repo.update(ctx, row.id as number, DATA.articles.update.parse({ infobox: box }) as never)
    expect((await repo.get(ctx, row.id as number))?.infobox).toEqual(box)
  })
})
