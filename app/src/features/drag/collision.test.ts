import { describe, expect, it } from 'vitest'
import { distanceBeyond, GAP_REACH, priorityOf } from './collision'
import type { Collision } from '@dnd-kit/core'

const hit = (id: string, priority?: number): Collision =>
  ({ id, data: { droppableContainer: { data: { current: priority === undefined ? {} : { priority } } } } }) as unknown as Collision

describe('priorityOf', () => {
  it('reads data.priority, 1 by default', () => {
    expect(priorityOf(hit('a', 3))).toBe(3)
    expect(priorityOf(hit('b'))).toBe(1)
    const sorted = [hit('zone'), hit('link', 3), hit('row', 2)].sort((a, b) => priorityOf(b) - priorityOf(a))
    expect(sorted.map((h) => h.id)).toEqual(['link', 'row', 'zone'])
  })
})

describe('distanceBeyond', () => {
  const box = { left: 0, top: 100, right: 200, bottom: 140 }
  it('is 0 inside a box, and the distance to it in the gap beside it', () => {
    expect(distanceBeyond({ x: 50, y: 120 }, box, GAP_REACH)).toBe(0)
    expect(distanceBeyond({ x: 50, y: 143 }, box, GAP_REACH)).toBe(3)
    expect(distanceBeyond({ x: 50, y: 97 }, box, GAP_REACH)).toBe(3)
    expect(distanceBeyond({ x: 203, y: 120 }, box, GAP_REACH)).toBe(3)
  })
  it('is null when the box is farther than the reach on either axis', () => {
    expect(distanceBeyond({ x: 50, y: 150 }, box, GAP_REACH)).toBeNull()
    expect(distanceBeyond({ x: 210, y: 120 }, box, GAP_REACH)).toBeNull()
  })
})
