import { describe, expect, it } from 'vitest'
import { extendShift } from './extendShift'

const room = { left: 0, right: 1000 }

describe('extendShift', () => {
  it('does not move a box that fits: it grows the same on both sides', () => {
    expect(extendShift({ left: 400, right: 500 }, 140, room)).toBe(0)
  })

  it('moves left by just what would go past the right edge, and the gap', () => {
    // Centred on 934, 140 wide: its right edge at 1004; 4 + 4 too far
    expect(extendShift({ left: 884, right: 984 }, 140, room)).toBe(-8)
  })

  it('moves right by just what would go past the left edge, and the gap', () => {
    expect(extendShift({ left: 10, right: 110 }, 140, room)).toBe(14)
  })

  it('keeps the left edge in view when there is no room for all of it', () => {
    const shift = extendShift({ left: 50, right: 150 }, 300, { left: 0, right: 200 })
    // Centred on 100, it would start at -50; moved so it starts at the left edge's gap
    expect(100 - 150 + shift).toBe(4)
  })
})
