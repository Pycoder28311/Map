import { describe, expect, it } from 'vitest'
import { shapeOutline, shapeParamDefault } from './shapes'
import { SHAPE_TYPES } from './types'

const box = { x: 100, y: 50, w: 80, h: 40 }

describe('shapeOutline', () => {
  it.each(SHAPE_TYPES)('%s has at least 3 points inside its box', (shape) => {
    const outline = shapeOutline(shape, box, 0, shapeParamDefault(shape))
    expect(outline.length).toBeGreaterThanOrEqual(3)
    for (const p of outline) {
      expect(p.x).toBeGreaterThanOrEqual(box.x - 0.001)
      expect(p.x).toBeLessThanOrEqual(box.x + box.w + 0.001)
      expect(p.y).toBeGreaterThanOrEqual(box.y - 0.001)
      expect(p.y).toBeLessThanOrEqual(box.y + box.h + 0.001)
    }
  })

  it('turns about the centre', () => {
    const outline = shapeOutline('rect', box, 90, 0)
    const xs = outline.map((p) => p.x)
    expect(Math.min(...xs)).toBeCloseTo(140 - 20)
    expect(Math.max(...xs)).toBeCloseTo(140 + 20)
  })

  it('a star has two points per arm and its param is clamped', () => {
    expect(shapeOutline('star', box, 0, 5)).toHaveLength(10)
    expect(shapeOutline('star', box, 0, 99)).toHaveLength(24)
    expect(shapeOutline('star', box, 0, 1)).toHaveLength(6)
  })

  it('a rounded rectangle clamps the radius to half the short side', () => {
    const outline = shapeOutline('roundRect', box, 0, 500)
    for (const p of outline) expect(p.y).toBeGreaterThanOrEqual(box.y - 0.001)
    expect(shapeOutline('roundRect', box, 0, 0)).toHaveLength(4)
  })
})
