import { describe, expect, it } from 'vitest'
import { sortByDate } from './sortByDate'

const items = [
  { id: 1, createdAt: '2026-10-02T10:00:00.000Z' },
  { id: 2, createdAt: '2026-10-03T10:00:00.000Z' },
  { id: 3, createdAt: '2026-10-01T10:00:00.000Z' },
  { id: 4, createdAt: '2026-10-02T10:00:00.000Z' },
]
const ids = (list: { id: number }[]) => list.map((i) => i.id)

describe('sortByDate', () => {
  it('keeps the server\'s order without a sort', () => {
    expect(sortByDate(items, null)).toBe(items)
  })
  it('sorts newest or oldest first, ties by id', () => {
    expect(ids(sortByDate(items, 'newest'))).toEqual([2, 1, 4, 3])
    expect(ids(sortByDate(items, 'oldest'))).toEqual([3, 1, 4, 2])
  })
  it('puts an item without a date first when oldest, last when newest', () => {
    const withMissing = [...items, { id: 5 }]
    expect(ids(sortByDate(withMissing, 'oldest'))[0]).toBe(5)
    expect(ids(sortByDate(withMissing, 'newest')).at(-1)).toBe(5)
  })
  it('does not change the list it is given', () => {
    const copy = [...items]
    sortByDate(items, 'newest')
    expect(items).toEqual(copy)
  })
})
