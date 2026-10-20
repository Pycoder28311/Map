import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS, type MockObject } from '../../mocks/projects'
import { describeDrop, dropPlan, ordinal, rowItems, sortCards } from './rows'

const objects = SEED_OBJECTS
const byId = (id: string) => objects.find((o) => o.id === id)!
const ids = (list: MockObject[]) => list.map((o) => o.id)

describe('rowItems', () => {
  it('lists every object in the Objects row', () => {
    expect(ids(rowItems(objects, 'objects'))).toEqual(['m1', 'm2', 'm3', 'm4', 'm5', 'o1', 'o2'])
  })

  it('lists nothing in the Projects and Notes rows: their items come from the server', () => {
    expect(rowItems(objects, 'notes')).toEqual([])
    expect(rowItems(objects, 'projects')).toEqual([])
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
  it('reorders in the Objects row', () => {
    expect(dropPlan(byId('o2'), { row: 'objects', beforeId: null })).toEqual({ kind: 'reorder', beforeId: null })
    expect(dropPlan(byId('o1'), { row: 'objects', beforeId: 'm3' })).toEqual({ kind: 'reorder', beforeId: 'm3' })
  })
  it('refuses a drop on itself', () => {
    expect(dropPlan(byId('o2'), { row: 'objects', beforeId: 'o2' })).toBeNull()
  })

  it('takes nothing into the Projects and Notes rows', () => {
    expect(dropPlan(byId('o2'), { row: 'notes', beforeId: null })).toBeNull()
    expect(dropPlan(byId('o2'), { row: 'projects', beforeId: null })).toBeNull()
  })
})

describe('undo note', () => {
  it('says where the card went', () => {
    expect(describeDrop(3)).toBe('Moved to 3rd in manual order')
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '103rd'])
  })
})
