import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS, type MockObject } from '../../mocks/projects'
import { describeDrop, dropPlan, nextSiblingId, ordinal, rowItems, sortCards } from './rows'

const objects = SEED_OBJECTS
const byId = (id: string) => objects.find((o) => o.id === id)!
const ids = (list: MockObject[]) => list.map((o) => o.id)

describe('rowItems', () => {
  it('lists the top level without projects or notes, and a project direct children', () => {
    expect(ids(rowItems(objects, 'orphans'))).toEqual(['o2', 'a6'])
    expect(ids(rowItems(objects, 'project:p2'))).toEqual(['m3', 'm4', 'o1', 'f1'])
  })

  it('lists every note in the Notes row, wherever it is, and in no other row', () => {
    const inProject = { ...byId('n1'), id: 'n9', parentId: 'p2' }
    const all = [...objects, inProject]
    expect(ids(rowItems(all, 'notes'))).toEqual(['n1', 'n2', 'n3', 'n4', 'n9'])
    expect(ids(rowItems(all, 'project:p2'))).not.toContain('n9')
  })
})

describe('sortCards', () => {
  const items = [
    { ...byId('n1'), createdAt: 2, likes: 5 },
    { ...byId('n2'), createdAt: 3, likes: 1 },
    { ...byId('n3'), createdAt: 1, likes: 5 },
  ]
  it('keeps manual order without a sort', () => {
    expect(sortCards(items, null)).toBe(items)
  })
  it('sorts by date either way, and by likes (ties by name)', () => {
    expect(ids(sortCards(items, 'newest'))).toEqual(['n2', 'n1', 'n3'])
    expect(ids(sortCards(items, 'oldest'))).toEqual(['n3', 'n1', 'n2'])
    expect(ids(sortCards(items, 'liked'))).toEqual(['n3', 'n1', 'n2']) // Meeting notes < Shopping list
  })
})

describe('dropPlan', () => {
  it('reorders in the same row and moves to another', () => {
    expect(dropPlan(byId('a6'), { row: 'orphans', beforeId: 'o2' })).toEqual({ kind: 'reorder', parentId: null, beforeId: 'o2' })
    expect(dropPlan(byId('a6'), { row: 'project:p1', beforeId: null })).toEqual({ kind: 'move', parentId: 'p1', beforeId: null })
  })
  it('puts only articles into folders', () => {
    expect(dropPlan(byId('a6'), { folderId: 'f1' })).toEqual({ kind: 'into-folder', folderId: 'f1' })
    expect(dropPlan(byId('n1'), { folderId: 'f1' })).toBeNull()
    expect(dropPlan(byId('a1'), { folderId: 'f1' })).toBeNull() // already in it
  })
  it('refuses projects and no-op drops', () => {
    expect(dropPlan(byId('p1'), { row: 'orphans', beforeId: null })).toBeNull()
    expect(dropPlan(byId('a6'), { row: 'orphans', beforeId: 'a6' })).toBeNull()
  })

  it('keeps notes out of the rows, and takes nothing into the Notes row', () => {
    expect(dropPlan(byId('n1'), { row: 'project:p1', beforeId: null })).toBeNull()
    expect(dropPlan(byId('a6'), { row: 'notes', beforeId: null })).toBeNull()
  })
})

describe('undo note', () => {
  it('says where the card went', () => {
    expect(describeDrop({ kind: 'reorder', parentId: null, beforeId: 'n1' }, { row: 'Orphans' }, 3)).toBe('Moved to 3rd in manual order')
    expect(describeDrop({ kind: 'move', parentId: 'p1', beforeId: null }, { row: 'City parks' }, 1)).toBe('Moved to City parks')
    expect(describeDrop({ kind: 'into-folder', folderId: 'f1' }, { row: 'Orphans', folder: 'Guides' }, 1)).toBe('Put in Guides')
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd'])
  })
  it('remembers the sibling after a card', () => {
    expect(nextSiblingId(objects, byId('n1'))).toBe('n2')
    expect(nextSiblingId(objects, byId('a6'))).toBeNull()
    expect(nextSiblingId(objects, byId('o1'))).toBe('f1')
  })
})
