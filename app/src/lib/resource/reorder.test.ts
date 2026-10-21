import { comparePositions } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { resourceByName } from '../../resources/registry'
import { compareEntries, endIndex, placement, positionAtEnd, type Entry } from './reorder'

const articles = resourceByName('articles')!
const folders = resourceByName('folders')!

const entry = (id: number, position: string, extra: Record<string, unknown> = {}, resource = articles): Entry => ({
  resource,
  item: { id, position, pinned: false, ...extra },
})
const between = (key: string, low: string | null, high: string | null) =>
  (low === null || comparePositions(low, key) < 0) && (high === null || comparePositions(key, high) < 0)

describe('compareEntries', () => {
  it('orders several resources together: pinned, position, then resource and id', () => {
    const list = [entry(1, 'a2'), entry(1, 'a1', {}, folders), entry(2, 'a1'), entry(3, 'a5', { pinned: true })]
    const sorted = [...list].sort(compareEntries).map((e) => `${e.resource.name}:${e.item.id}`)
    expect(sorted).toEqual(['articles:3', 'articles:2', 'folders:1', 'articles:1'])
  })
})

describe('placement', () => {
  const list = [entry(1, 'a0'), entry(2, 'a1'), entry(3, 'a2')]
  const moved = entry(9, 'a5')

  it('puts an item between its new neighbours, first or last, writing it only', () => {
    const middle = placement(list, 1, moved)!
    expect(between(middle.position, 'a0', 'a1')).toBe(true)
    expect(middle.fixes).toEqual([])
    expect(between(placement(list, 0, moved)!.position, null, 'a0')).toBe(true)
    expect(between(placement(list, 3, moved)!.position, 'a2', null)).toBe(true)
    expect(placement([], 0, moved)!.position).toBe('a0')
  })

  it('works between items of different resources', () => {
    const mixed = [entry(1, 'a0'), entry(1, 'a1', {}, folders)]
    expect(between(placement(mixed, 1, moved)!.position, 'a0', 'a1')).toBe(true)
  })

  it('keeps pinned items first: no place across the boundary', () => {
    const withPins = [entry(1, 'a0', { pinned: true }), entry(2, 'a0'), entry(3, 'a1')]
    expect(placement(withPins, 0, moved)).toBeNull()
    expect(between(placement(withPins, 1, moved)!.position, null, 'a0')).toBe(true)
    const pinned = entry(8, 'a3', { pinned: true })
    expect(placement(withPins, 2, pinned)).toBeNull()
    expect(between(placement(withPins, 1, pinned)!.position, 'a0', null)).toBe(true)
  })

  it('gives tied neighbours new keys around the moved item', () => {
    const tied = [entry(1, 'a0'), entry(2, 'a1'), entry(3, 'a1'), entry(4, 'a1'), entry(5, 'a3')]
    const result = placement(tied, 2, moved)!
    const order = [tied[0], tied[1], moved, tied[2], tied[3], tied[4]]
    const keyOf = (e: Entry) => (e === moved ? result.position : (result.fixes.find((f) => f.entry === e)?.position ?? (e.item.position as string)))
    const keys = order.map(keyOf)
    for (let i = 1; i < keys.length; i++) expect(comparePositions(keys[i - 1], keys[i])).toBeLessThan(0)
    expect(result.fixes.map((f) => f.entry.item.id)).toEqual([2, 3, 4])
  })
})

describe('the end of a list', () => {
  it('is after the last unpinned item, and after the pinned ones for a pinned item', () => {
    const list = [entry(1, 'a5', { pinned: true }), entry(2, 'a0'), entry(3, 'a1')]
    expect(positionAtEnd(list)).toBe('a2')
    expect(endIndex(list, entry(9, 'a0'))).toBe(3)
    expect(endIndex(list, entry(9, 'a0', { pinned: true }))).toBe(1)
  })
})
