import { describe, expect, it } from 'vitest'
import type { MockObject } from '../../mocks/projects'
import { NO_FILTERS, searchObjects } from './search'

const base = { draggable: true, locked: false, archived: false, createdAt: 0, likes: 0 }
const objects: MockObject[] = [
  { ...base, id: 'p1', kind: 'project', name: 'City parks', parentId: null },
  { ...base, id: 'm1', kind: 'map', name: 'Parks overview', parentId: 'p1' },
  { ...base, id: 'n1', kind: 'note', name: 'Café ideas', parentId: null, text: 'a list of parks' },
  { ...base, id: 'a1', kind: 'article', name: 'Park benches', parentId: 'p2' },
]
const ids = (list: MockObject[]) => list.map((o) => o.id)

describe('searchObjects', () => {
  it('finds nothing without a query or filters', () => {
    expect(searchObjects(objects, '  ', NO_FILTERS)).toEqual([])
  })

  it('matches every word in the name or text, ignoring case and accents, best first', () => {
    expect(ids(searchObjects(objects, 'park', NO_FILTERS))).toEqual(['a1', 'm1', 'p1', 'n1'])
    expect(ids(searchObjects(objects, 'CAFE', NO_FILTERS))).toEqual(['n1'])
    expect(ids(searchObjects(objects, 'parks city', NO_FILTERS))).toEqual(['p1'])
  })

  it('includes or excludes kinds', () => {
    expect(ids(searchObjects(objects, 'park', { ...NO_FILTERS, types: ['map', 'note'] }))).toEqual(['m1', 'n1'])
    expect(ids(searchObjects(objects, 'park', { ...NO_FILTERS, typeMode: 'exclude', types: ['map', 'note'] }))).toEqual(['a1', 'p1'])
  })

  it('keeps only objects in the ticked projects, and lists them all without a query', () => {
    expect(ids(searchObjects(objects, '', { ...NO_FILTERS, projects: ['p1', 'p2'] }))).toEqual(['a1', 'm1'])
  })
})
