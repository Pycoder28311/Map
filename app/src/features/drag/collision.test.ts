import { describe, expect, it } from 'vitest'
import { priorityOf } from './collision'
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
