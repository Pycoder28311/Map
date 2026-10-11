import { describe, expect, it } from 'vitest'
import { floatPosition, grabFraction } from './floatPosition'

describe('floating copy placement', () => {
  it('keeps the pointer at the grabbed spot, also when the copy changes size', () => {
    const grab = grabFraction({ x: 150, y: 110 }, { left: 100, top: 100, width: 200, height: 40 })
    expect(grab).toEqual({ fx: 0.25, fy: 0.25 })
    expect(floatPosition({ x: 500, y: 300 }, grab, { width: 200, height: 40 })).toEqual({ left: 450, top: 290 })
    // Wider copy over another surface: the pointer is still a quarter in from its left and top
    expect(floatPosition({ x: 500, y: 300 }, grab, { width: 400, height: 80 })).toEqual({ left: 400, top: 280 })
  })

  it('clamps a grab outside the element', () => {
    expect(grabFraction({ x: 0, y: 500 }, { left: 100, top: 100, width: 200, height: 40 })).toEqual({ fx: 0, fy: 1 })
  })
})
