import { DATA, exploreFilter, rightsApply, type ExplorableName } from '@map/shared'
import { describe, expect, it } from 'vitest'
import * as schema from '../../db/schema'
import type { Ctx } from '../../lib/crud'
import { HttpError } from '../../lib/errors'
import { ownedRepo } from '../../lib/ownedRepo'
import { newUser } from '../../lib/ownedRepo.suite'
import { applyRights } from '../rights/rights.repo'
import { exploreRepo } from './explore.repo'

const repos = {
  articles: ownedRepo(schema.articles, DATA.articles),
  maps: ownedRepo(schema.maps, DATA.maps),
  projects: ownedRepo(schema.projects, DATA.projects),
  folders: ownedRepo(schema.folders, DATA.folders),
  notes: ownedRepo(schema.notes, DATA.notes),
}

/** A row of the owner's, public unless asked */
async function make(owner: Ctx, type: keyof typeof repos, title: string, extra: Record<string, unknown> = {}, isPublic = true) {
  const table = DATA[type] as { input: { parse: (v: unknown) => unknown } }
  const id = (await repos[type].create(owner, table.input.parse({ title, ...extra }) as never)).id as number
  if (isPublic) await applyRights(owner, rightsApply.parse({ objectType: type, objectId: id, visibility: 'public' }))
  return id
}

const explore = (ctx: Ctx, filter: Record<string, string> = {}, limit = 50, cursor: string | null = null) => exploreRepo.list(ctx, { limit, cursor }, exploreFilter.parse(filter))
/** Only what these tests made (the database is shared by every test file) */
const titles = async (ctx: Ctx, filter: Record<string, string> = {}, tag = '') =>
  (await explore(ctx, filter, 100)).items.filter((i) => i.title.includes(tag)).map((i) => i.title)

describe('explore', () => {
  it('lists public objects of every explorable table, newest first, with their owner; never private ones, notes or the Trash', async () => {
    const olga = newUser('Olga')
    const me = newUser('Me')
    await make(olga, 'articles', 'T1 article')
    await make(olga, 'maps', 'T1 map')
    await make(olga, 'projects', 'T1 project')
    await make(me, 'folders', 'T1 folder')
    await make(olga, 'articles', 'T1 private', {}, false)
    await make(olga, 'notes', 'T1 note')
    const trashed = await make(olga, 'articles', 'T1 trashed')
    await repos.articles.update(olga, trashed, DATA.articles.update.parse({ archived: true }) as never)

    // Dates are whole seconds: rows made in the same second come in a fixed order of their tables
    const listed = (await explore(me, {}, 100)).items.filter((i) => i.title.startsWith('T1'))
    expect(listed.map((i) => i.title).sort()).toEqual(['T1 article', 'T1 folder', 'T1 map', 'T1 project'])
    const dates = listed.map((i) => i.createdAt)
    expect(dates).toEqual([...dates].sort().reverse())
    const page = await explore(me, { q: 'T1 map' })
    expect(page.items).toEqual([
      { type: 'maps', id: expect.any(Number), title: 'T1 map', preview: '', createdAt: expect.any(String), owner: { id: olga.user!.id, name: 'Olga', image: null }, mine: false },
    ])
    expect((await explore(me, { q: 'T1 folder' })).items[0].mine).toBe(true)
  })

  it('searches titles, and the first words of articles and projects; case does not matter; % and _ are themselves', async () => {
    const olga = newUser()
    await make(olga, 'articles', 'T2 Lighthouse keepers', { content: '<p>Stories of the bell tower</p>' })
    await make(olga, 'maps', 'T2 Bell coast')
    await make(olga, 'projects', 'T2 100% done')
    await make(olga, 'folders', 'T2 a_b')
    expect(await titles(olga, { q: 'lighthouse' })).toEqual(['T2 Lighthouse keepers'])
    expect(await titles(olga, { q: 'BELL' }, 'T2')).toEqual(['T2 Bell coast', 'T2 Lighthouse keepers'])
    expect(await titles(olga, { q: '100%' })).toEqual(['T2 100% done'])
    expect(await titles(olga, { q: '%' }, 'T2')).toEqual(['T2 100% done'])
    expect(await titles(olga, { q: 'a_b' })).toEqual(['T2 a_b'])
    expect(await titles(olga, { q: 'T2 a b' })).toEqual([])
  })

  it('one type only', async () => {
    const olga = newUser()
    await make(olga, 'articles', 'T3 one')
    await make(olga, 'maps', 'T3 two')
    expect(await titles(olga, { q: 'T3', type: 'maps' })).toEqual(['T3 two'])
    for (const type of ['articles', 'projects', 'folders', 'maps'] as ExplorableName[]) {
      const page = await explore(olga, { type })
      expect(page.items.every((i) => i.type === type)).toBe(true)
    }
  })

  it('pages across the tables with no repeats and no gaps (rows of the same second too)', async () => {
    const olga = newUser()
    const made: string[] = []
    for (let i = 0; i < 7; i++) {
      const type = (['articles', 'maps', 'projects', 'folders'] as const)[i % 4]
      made.push(`T4 ${i}`)
      await make(olga, type, `T4 ${i}`)
    }
    const seen: string[] = []
    let cursor: string | null = null
    do {
      const page = await explore(olga, { q: 'T4' }, 2, cursor)
      expect(page.items.length).toBeLessThanOrEqual(2)
      seen.push(...page.items.map((i) => i.title))
      cursor = page.nextCursor
    } while (cursor)
    expect(seen).toHaveLength(7)
    expect(new Set(seen)).toEqual(new Set(made))
  })

  it('a made-up cursor is a 400; it is list only', async () => {
    const me = newUser()
    await expect(explore(me, {}, 5, 'nonsense')).rejects.toBeInstanceOf(HttpError)
    expect(await exploreRepo.get(me, 1)).toBeNull()
  })
})
