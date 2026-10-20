import { describe, expect, it } from 'vitest'
import type { MockObject } from '../../mocks/projects'
import { NO_FILTERS, searchAll, searchObjects, type SearchItem } from './search'

const base = { archived: false, createdAt: 0 }
const objects: MockObject[] = [
  { ...base, id: 'm1', kind: 'map', name: 'Parks overview' },
  { ...base, id: 'o1', kind: 'object', name: 'Café bench', description: 'a bench in the park\nsecond line' },
  { ...base, id: 'o2', kind: 'object', name: 'Park benches' },
]
const notes: SearchItem[] = [
  { id: '5', kind: 'note', name: 'Café ideas', text: 'a list of parks' },
  { id: '6', kind: 'note', name: 'Shopping', text: 'bread and milk' },
]
const ids = (list: { id: string }[]) => list.map((o) => o.id)

describe('searchObjects (the mock objects)', () => {
  it('finds nothing without a query or filters', () => {
    expect(searchObjects(objects, '  ', NO_FILTERS)).toEqual([])
  })

  it('matches every word in the name or description, ignoring case and accents, best first', () => {
    expect(ids(searchObjects(objects, 'park', NO_FILTERS))).toEqual(['o2', 'm1', 'o1'])
    expect(ids(searchObjects(objects, 'CAFE', NO_FILTERS))).toEqual(['o1'])
    expect(ids(searchObjects(objects, 'overview parks', NO_FILTERS))).toEqual(['m1'])
  })

  it('describes a result by the first line of its description', () => {
    const results = searchObjects(objects, 'park', NO_FILTERS)
    expect(results.find((r) => r.id === 'm1')?.description).toBeUndefined()
    expect(results.find((r) => r.id === 'o1')?.description).toBe('a bench in the park')
  })

  it('includes or excludes kinds', () => {
    expect(ids(searchObjects(objects, 'park', { ...NO_FILTERS, types: ['map'] }))).toEqual(['m1'])
    expect(ids(searchObjects(objects, 'park', { ...NO_FILTERS, typeMode: 'exclude', types: ['map'] }))).toEqual(['o2', 'o1'])
  })

  it('lists every object of the ticked kinds without a query', () => {
    expect(ids(searchObjects(objects, '', { ...NO_FILTERS, types: ['object'] }))).toEqual(['o1', 'o2'])
  })
})

describe('searchAll (mock objects and a resource\'s items)', () => {
  it('finds a note by its title or its preview, among the others', () => {
    expect(ids(searchAll(objects, notes, 'cafe', NO_FILTERS))).toEqual(['o1', '5']) // both start with it: by name
    expect(ids(searchAll(objects, notes, 'milk', NO_FILTERS))).toEqual(['6']) // only in the preview
  })

  it('ranks by name first, whatever the source', () => {
    // 'Park benches' (mock) starts with it; 'Café ideas' only has it in its preview
    expect(ids(searchAll(objects, notes, 'park', NO_FILTERS))).toEqual(['o2', 'm1', 'o1', '5'])
  })

  it('takes the preview as the note\'s description', () => {
    expect(searchAll(objects, notes, 'milk', NO_FILTERS)[0]).toMatchObject({ kind: 'note', name: 'Shopping', description: 'bread and milk' })
  })

  it('filters notes by kind', () => {
    expect(ids(searchAll(objects, notes, 'cafe', { ...NO_FILTERS, types: ['note'] }))).toEqual(['5'])
    expect(ids(searchAll(objects, notes, 'cafe', { ...NO_FILTERS, typeMode: 'exclude', types: ['note'] }))).toEqual(['o1'])
  })

  it('lists every item of a ticked kind without a query', () => {
    expect(ids(searchAll(objects, notes, '', { ...NO_FILTERS, types: ['note'] }))).toEqual(['5', '6'])
  })

  it('finds nothing archived: archived items are never given to it', () => {
    // The caller (useSearchItems) only asks for archived=false; the search itself has no notion of it
    expect(ids(searchAll(objects, [], 'cafe', NO_FILTERS))).toEqual(['o1'])
  })
})
