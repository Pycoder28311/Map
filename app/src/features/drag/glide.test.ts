import { describe, expect, it } from 'vitest'
import { moved, nearestTo, travel } from './glide'

const box = (left: number, top: number) => ({ left, top, width: 100, height: 40 })

describe('glide', () => {
  it('says whether a place changed by more than a pixel', () => {
    expect(moved({ left: 10, top: 10 }, { left: 10.5, top: 10 })).toBe(false)
    expect(moved({ left: 10, top: 10 }, { left: 10, top: 12 })).toBe(true)
  })

  it('picks the element nearest to where the object was let go', () => {
    const boxes = [box(0, 0), box(0, 200), box(0, 400)]
    expect(nearestTo(boxes, { x: 50, y: 230 })).toBe(1)
    expect(nearestTo(boxes, { x: 50, y: 10 })).toBe(0)
    expect(nearestTo(boxes, null)).toBe(0)
  })

  it('says how far an element has to travel back, or nothing when it stayed', () => {
    expect(travel({ left: 10, top: 100 }, { left: 10, top: 60 })).toEqual({ dx: 0, dy: 40 })
    expect(travel({ left: 10, top: 100 }, { left: 10.4, top: 100.5 })).toBeNull()
  })
})
