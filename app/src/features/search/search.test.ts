import { describe, expect, it } from 'vitest'
import { NO_FILTERS, searchAll, type SearchItem } from './search'

const items: SearchItem[] = [
  { id: '1', kind: 'map', name: 'Parks overview', text: '' },
  { id: '2', kind: 'object', name: 'Café bench', text: 'a bench in the park\nsecond line' },
  { id: '3', kind: 'object', name: 'Park benches', text: '' },
  { id: '5', kind: 'note', name: 'Café ideas', text: 'a list of parks' },
  { id: '6', kind: 'note', name: 'Shopping', text: 'bread and milk' },
]
const ids = (list: { id: string }[]) => list.map((o) => o.id)

describe('searchAll', () => {
  it('finds nothing without a query or filters', () => {
    expect(searchAll(items, '  ', NO_FILTERS)).toEqual([])
  })

  it('matches every word in the name or text, ignoring case and accents, best first', () => {
    expect(ids(searchAll(items, 'park', NO_FILTERS))).toEqual(['3', '1', '2', '5'])
    expect(ids(searchAll(items, 'CAFE', NO_FILTERS))).toEqual(['2', '5'])
    expect(ids(searchAll(items, 'overview parks', NO_FILTERS))).toEqual(['1'])
    expect(ids(searchAll(items, 'milk', NO_FILTERS))).toEqual(['6'])
  })

  it('describes a result by the first line of its text', () => {
    const results = searchAll(items, 'park', NO_FILTERS)
    expect(results.find((r) => r.id === '1')?.description).toBeUndefined()
    expect(results.find((r) => r.id === '2')?.description).toBe('a bench in the park')
    expect(searchAll(items, 'milk', NO_FILTERS)[0]).toMatchObject({ kind: 'note', name: 'Shopping', description: 'bread and milk' })
  })

  it('includes or excludes kinds', () => {
    expect(ids(searchAll(items, 'park', { ...NO_FILTERS, types: ['map'] }))).toEqual(['1'])
    expect(ids(searchAll(items, 'park', { ...NO_FILTERS, typeMode: 'exclude', types: ['map'] }))).toEqual(['3', '2', '5'])
    expect(ids(searchAll(items, 'cafe', { ...NO_FILTERS, types: ['note'] }))).toEqual(['5'])
  })

  it('lists every item of a ticked kind without a query, by name', () => {
    expect(ids(searchAll(items, '', { ...NO_FILTERS, types: ['note'] }))).toEqual(['5', '6'])
  })
})
