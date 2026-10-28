import { describe, expect, it, vi } from 'vitest'
import { nextToLoad, ObjectPages, PAGE, PAGES_PER_SEARCH, type ObjectSource } from './objectSearch'

/** A kind with `count` items named "<name> 0" … , read PAGE at a time */
function source(type: ObjectSource['type'], name: string, count: number) {
  const list = vi.fn(async ({ limit, cursor }: { limit: number; cursor: string | null }) => {
    const start = Number(cursor ?? 0)
    const items = Array.from({ length: Math.max(0, Math.min(limit, count - start)) }, (_, i) => ({ id: start + i, title: `${name} ${start + i}` }))
    return { items, nextCursor: start + limit < count ? String(start + limit) : null }
  })
  return { type, list, title: (item: Record<string, unknown>) => String(item.title) } satisfies ObjectSource
}

describe('ObjectPages', () => {
  it('reads one page at a time, and stops at the end', async () => {
    const articles = source('article', 'Article', PAGE + 5)
    const pages = new ObjectPages([articles])
    await pages.loadMore('article')
    expect(pages.results(['article'], '')).toHaveLength(PAGE)
    await pages.loadMore('article')
    expect(pages.results(['article'], '')).toHaveLength(PAGE + 5)
    await pages.loadMore('article')
    expect(articles.list).toHaveBeenCalledTimes(2)
    expect(pages.more(['article'])).toEqual([])
  })

  it('filters what it has, leaves out the article itself, sorts All by title', async () => {
    const pages = new ObjectPages([source('article', 'Zeta', 3), source('map', 'Alpha', 2)])
    await pages.loadMore('article')
    await pages.loadMore('map')
    expect(pages.results(['article'], 'zeta 1')).toEqual([{ type: 'article', id: '1', title: 'Zeta 1' }])
    expect(pages.results(['article'], '', 'article:0').map((h) => h.id)).toEqual(['1', '2'])
    expect(pages.results(['article', 'map'], '').map((h) => h.title)).toEqual(['Alpha 0', 'Alpha 1', 'Zeta 0', 'Zeta 1', 'Zeta 2'])
  })

  it('keeps an error and does not ask again by itself', async () => {
    const broken: ObjectSource = { type: 'map', list: async () => Promise.reject(new Error('offline')), title: () => '' }
    const pages = new ObjectPages([broken])
    await pages.loadMore('map')
    expect(pages.error(['map'])).toBe('offline')
    expect(nextToLoad(pages, ['map'], 0, 0)).toBeNull()
  })
})

describe('nextToLoad', () => {
  it('starts every kind first, then reads more while there are few matches', async () => {
    const pages = new ObjectPages([source('article', 'A', 100), source('map', 'M', 100)])
    expect(nextToLoad(pages, ['article', 'map'], 0, 0)).toBe('article')
    await pages.loadMore('article')
    expect(nextToLoad(pages, ['article', 'map'], 0, 1)).toBe('map')
    await pages.loadMore('map')
    expect(nextToLoad(pages, ['article', 'map'], 2, 2)).toBe('article')
    expect(nextToLoad(pages, ['article', 'map'], 50, 2)).toBeNull()
    expect(nextToLoad(pages, ['article', 'map'], 2, PAGES_PER_SEARCH)).toBeNull()
  })
})
