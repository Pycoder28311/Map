import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS, type MockObject } from '../../mocks/projects'
import { describeDrop, dropPlan, nextSiblingId, ordinal, rowItems, sortCards } from './rows'

const objects = SEED_OBJECTS
const byId = (id: string) => objects.find((o) => o.id === id)!
const ids = (list: MockObject[]) => list.map((o) => o.id)

describe('rowItems', () => {
  it('lists the top-level objects without projects, and a project direct children', () => {
    expect(ids(rowItems(objects, 'orphans'))).toEqual(['o2'])
    expect(ids(rowItems(objects, 'project:p2'))).toEqual(['m3', 'm4', 'o1'])
  })

  it('lists nothing in the Notes row: the notes come from the server', () => {
    expect(rowItems(objects, 'notes')).toEqual([])
  })
})

describe('sortCards', () => {
  const items = [
    { ...byId('m1'), createdAt: 2 },
    { ...byId('m2'), createdAt: 3 },
    { ...byId('m3'), createdAt: 1 },
  ]
  it('keeps manual order without a sort', () => {
    expect(sortCards(items, null)).toBe(items)
  })
  it('sorts by date either way', () => {
    expect(ids(sortCards(items, 'newest'))).toEqual(['m2', 'm1', 'm3'])
    expect(ids(sortCards(items, 'oldest'))).toEqual(['m3', 'm1', 'm2'])
  })
  it('breaks ties by name', () => {
    const same = [{ ...byId('m2'), createdAt: 5 }, { ...byId('m1'), createdAt: 5 }]
    expect(ids(sortCards(same, 'newest'))).toEqual(['m2', 'm1'].sort((a, b) => byId(a).name.localeCompare(byId(b).name)))
  })
})

describe('dropPlan', () => {
  it('reorders in the same row and moves to another', () => {
    expect(dropPlan(byId('o2'), { row: 'orphans', beforeId: null })).toEqual({ kind: 'reorder', parentId: null, beforeId: null })
    expect(dropPlan(byId('o1'), { row: 'project:p2', beforeId: 'm3' })).toEqual({ kind: 'reorder', parentId: 'p2', beforeId: 'm3' })
    expect(dropPlan(byId('o2'), { row: 'project:p1', beforeId: null })).toEqual({ kind: 'move', parentId: 'p1', beforeId: null })
  })
  it('moves a map out of its project to the top level', () => {
    expect(dropPlan(byId('m1'), { row: 'orphans', beforeId: null })).toEqual({ kind: 'move', parentId: null, beforeId: null })
  })
  it('refuses projects and no-op drops', () => {
    expect(dropPlan(byId('p1'), { row: 'orphans', beforeId: null })).toBeNull()
    expect(dropPlan(byId('o2'), { row: 'orphans', beforeId: 'o2' })).toBeNull()
  })

  it('takes nothing into the Notes row', () => {
    expect(dropPlan(byId('o2'), { row: 'notes', beforeId: null })).toBeNull()
  })
})

describe('undo note', () => {
  it('says where the card went', () => {
    expect(describeDrop({ kind: 'reorder', parentId: null, beforeId: 'o1' }, { row: 'Orphans' }, 3)).toBe('Moved to 3rd in manual order')
    expect(describeDrop({ kind: 'move', parentId: 'p1', beforeId: null }, { row: 'City parks' }, 1)).toBe('Moved to City parks')
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd'])
  })
  it('remembers the sibling after a card', () => {
    expect(nextSiblingId(objects, byId('m3'))).toBe('m4')
    expect(nextSiblingId(objects, byId('o2'))).toBeNull()
    expect(nextSiblingId(objects, byId('m4'))).toBe('o1')
  })
})
