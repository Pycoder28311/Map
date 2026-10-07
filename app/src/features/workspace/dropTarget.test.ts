import { describe, expect, it } from 'vitest'
import { dropTargetAt } from './dropTarget'
import type { DropSpot } from './layout'

const HALF = { x: 0.5, y: 0.5 }
const ALL: DropSpot[] = ['left', 'right', 'top', 'bottom', 'center']
const all = () => ALL

describe('dropTargetAt', () => {
  it('finds the slot under the point, its spanning cells included', () => {
    // 3-left: a is the whole left column
    expect(dropTargetAt('3-left', HALF, { x: 0.25, y: 0.9 }, all)?.slot).toBe('a')
    expect(dropTargetAt('3-left', HALF, { x: 0.75, y: 0.9 }, all)?.slot).toBe('c')
  })

  it('follows the split lines', () => {
    expect(dropTargetAt('2-cols', { x: 0.3, y: 0.5 }, { x: 0.4, y: 0.5 }, all)?.slot).toBe('b')
  })

  it('an edge near it, the centre in the middle', () => {
    expect(dropTargetAt('2-cols', HALF, { x: 0.05, y: 0.5 }, all)).toEqual({ slot: 'a', spot: 'left' })
    expect(dropTargetAt('2-cols', HALF, { x: 0.25, y: 0.5 }, all)).toEqual({ slot: 'a', spot: 'center' })
    expect(dropTargetAt('2-cols', HALF, { x: 0.25, y: 0.95 }, all)).toEqual({ slot: 'a', spot: 'bottom' })
  })

  it('only the allowed spots', () => {
    expect(dropTargetAt('2-cols', HALF, { x: 0.05, y: 0.5 }, () => ['center'])).toEqual({ slot: 'a', spot: 'center' })
    expect(dropTargetAt('2-cols', HALF, { x: 0.25, y: 0.5 }, () => [])).toBeNull()
  })

  it('null outside the grid', () => {
    expect(dropTargetAt('2-cols', HALF, { x: 1.2, y: 0.5 }, all)).toBeNull()
  })
})
