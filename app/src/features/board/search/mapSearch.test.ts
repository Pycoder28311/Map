import { describe, expect, it } from 'vitest'
import { border, boardOf, line, point, pts, shape, text } from '../testing'
import { LAYER_BACKGROUND } from '../types'
import { ALL, filtersOf, matchEntries, sameFilter, searchEntries } from './mapSearch'

const doc = (words: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: words }] }] })

const board = boardOf(
  point(1, { name: 'Athens', label: 'city', description: doc('The capital') }),
  point(2, { label: 'nature' }),
  point(3, { name: 'Olympus', label: 'nature' }),
  border(4, pts([0, 0], [10, 0], [10, 10]), { description: 'Hills' }),
  text(5, { text: 'Attica', isName: true, attach: 4 }),
  line(6, pts([0, 0], [5, 5]), { name: 'Route 1' }),
  line(7, pts([0, 0], [5, 5])),
  shape(8, { name: 'Ágora' }),
  point(9, { name: 'Hidden', layer: LAYER_BACKGROUND }),
)

describe('searchEntries', () => {
  it('finds every point and the named lines, areas and shapes, never texts or the background', () => {
    const entries = searchEntries(board)
    expect(entries.map((e) => e.id)).toEqual([1, 2, 3, 4, 6, 8])
  })

  it('names an area by its name text, and an unnamed point "Untitled point"', () => {
    const entries = searchEntries(board)
    expect(entries.find((e) => e.id === 4)).toMatchObject({ name: 'Attica', type: 'Area', description: 'Hills' })
    expect(entries.find((e) => e.id === 2)).toMatchObject({ name: 'Untitled point', type: 'Nature spot', label: 'nature' })
    expect(entries.find((e) => e.id === 1)?.description).toBe('The capital')
  })
})

describe('filtersOf', () => {
  it('shows All, the labels in use and the kinds in use, with their counts', () => {
    expect(filtersOf(searchEntries(board)).map((t) => `${t.name} ${t.count}`)).toEqual(['All 6', 'City 1', 'Nature spot 2', 'Areas 1', 'Lines 1', 'Shapes 1'])
  })
})

describe('matchEntries', () => {
  const entries = searchEntries(board)

  it('lists the whole tab alphabetically without a query', () => {
    expect(matchEntries(entries, '', ALL).map((e) => e.name)).toEqual(['Ágora', 'Athens', 'Attica', 'Olympus', 'Route 1', 'Untitled point'])
    expect(matchEntries(entries, '', { by: 'label', label: 'nature' }).map((e) => e.id)).toEqual([3, 2])
    expect(matchEntries(entries, '', { by: 'kind', kind: 'line' }).map((e) => e.id)).toEqual([6])
  })

  it('ignores accents and case, and puts names that start with the query first (then the other matches, the type "Nature spot" has "at")', () => {
    expect(matchEntries(entries, 'agora', ALL).map((e) => e.id)).toEqual([8])
    expect(matchEntries(entries, 'AT', ALL).map((e) => e.name)).toEqual(['Athens', 'Attica', 'Olympus', 'Untitled point'])
  })

  it('also finds by type and description, every word needed', () => {
    expect(matchEntries(entries, 'nature', ALL).map((e) => e.id)).toEqual([3, 2])
    expect(matchEntries(entries, 'capital', ALL).map((e) => e.id)).toEqual([1])
    expect(matchEntries(entries, 'capital hills', ALL)).toEqual([])
  })

  it('compares filters', () => {
    expect(sameFilter(ALL, { by: 'all' })).toBe(true)
    expect(sameFilter({ by: 'label', label: 'city' }, { by: 'label', label: 'store' })).toBe(false)
    expect(sameFilter({ by: 'kind', kind: 'line' }, { by: 'kind', kind: 'line' })).toBe(true)
  })
})
