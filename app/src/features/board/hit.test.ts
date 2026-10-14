import { describe, expect, it } from 'vitest'
import { hitObject, hitPart, hitTest, hitTestPart, objectsInRect, segmentTouchesRect } from './hit'
import { DEFAULT_STYLE } from './style'
import { border as border_, boardOf, line, pts, shape, text } from './testing'
import { LAYER_BACKGROUND, type BorderObject } from './types'

const thin = { ...DEFAULT_STYLE, thickness: 2 }

describe('hitTest', () => {
  it('hits a line within the tolerance only', () => {
    const l = line(1, pts([0, 0], [100, 0]), { style: thin })
    expect(hitObject(l, { x: 50, y: 5 }, 6)).toBe(true)
    expect(hitObject(l, { x: 50, y: 7 }, 6)).toBe(false)
    // zoomed out the same pixels are more board units
    expect(hitObject(l, { x: 50, y: 25 }, 6 / 0.2)).toBe(true)
  })

  it('picks the topmost, and skips the background layer', () => {
    const under = line(1, pts([0, 0], [100, 0]), { style: thin })
    const over = line(2, pts([0, 0], [100, 0]), { style: thin })
    expect(hitTest(boardOf(under, over), { x: 50, y: 0 }, 6)?.id).toBe(2)
    expect(hitTest(boardOf(under, { ...over, layer: LAYER_BACKGROUND }), { x: 50, y: 0 }, 6)?.id).toBe(1)
    expect(hitTest(boardOf(under), { x: 50, y: 50 }, 6)).toBeNull()
  })

  it('closes a border and hits inside a shape', () => {
    const border: BorderObject = border_(1, pts([0, 0], [100, 0], [100, 100]), { style: thin })
    expect(hitObject(border, { x: 50, y: 50 }, 3)).toBe(true) // the closing segment
    expect(hitObject(shape(2), { x: 50, y: 25 }, 0)).toBe(true)
    expect(hitObject(shape(2), { x: 150, y: 25 }, 0)).toBe(false)
  })
})

describe('objectsInRect', () => {
  it('picks a line whose segment crosses the rectangle with no point inside', () => {
    const l = line(1, pts([0, 50], [100, 50]))
    const rect = { x: 40, y: 0, w: 20, h: 100 }
    expect(segmentTouchesRect({ x: 0, y: 50 }, { x: 100, y: 50 }, rect)).toBe(true)
    expect(objectsInRect(boardOf(l), rect).map((o) => o.id)).toEqual([1])
  })

  it('leaves out lines the rectangle misses, even if their box is touched', () => {
    const diagonal = line(1, pts([0, 0], [100, 100]))
    expect(objectsInRect(boardOf(diagonal), { x: 80, y: 0, w: 20, h: 20 })).toEqual([])
  })
})

describe('curves and shapes', () => {
  const bulge = line(1, pts([0, 0], [100, 0]), { handles: [{ inX: 0, inY: 0, outX: 0, outY: 60 }, { inX: 0, inY: 60, outX: 0, outY: 0 }] })

  it('a handled line is hit where it curves, not along its chord', () => {
    expect(hitObject(bulge, { x: 50, y: 45 }, 3)).toBe(true)
    expect(hitObject(bulge, { x: 50, y: 0 }, 3)).toBe(false)
  })

  it('an ellipse is not hit in the corner of its box', () => {
    const e = shape(2, { shape: 'ellipse', box: { x: 0, y: 0, w: 100, h: 100 } })
    expect(hitObject(e, { x: 50, y: 50 }, 2)).toBe(true)
    expect(hitObject(e, { x: 4, y: 4 }, 2)).toBe(false)
  })
})

describe('areas', () => {
  const area = border_(1, pts([0, 0], [100, 0], [100, 100], [0, 100]), { style: thin })

  it('are hit on the edge and anywhere inside', () => {
    expect(hitPart(area, { x: 50, y: 0 }, 2)).toBe('edge')
    expect(hitPart(area, { x: 50, y: 50 }, 2)).toBe('inside')
    expect(hitPart(area, { x: 150, y: 50 }, 2)).toBeNull()
    expect(hitObject(area, { x: 50, y: 50 }, 2)).toBe(true)
  })

  it('a line above an area wins inside it', () => {
    const above = line(2, pts([0, 50], [100, 50]), { style: thin })
    const found = hitTestPart(boardOf(area, above), { x: 50, y: 50 }, 2)
    expect(found?.object.id).toBe(2)
    expect(hitTestPart(boardOf(area, above), { x: 50, y: 80 }, 2)).toMatchObject({ part: 'inside' })
  })
})

describe('text', () => {
  it('is hit inside its box, also when turned, and not far away', () => {
    const t = text(1, { anchor: { x: 100, y: 100 }, width: 200, text: 'hello' })
    expect(hitObject(t, { x: 150, y: 110 }, 2)).toBe(true)
    expect(hitObject(t, { x: 400, y: 400 }, 2)).toBe(false)
    const turned = text(2, { anchor: { x: 100, y: 100 }, width: 200, text: 'hello', rotation: 90 })
    expect(hitObject(turned, { x: 200, y: 190 }, 2)).toBe(true)
    expect(hitObject(turned, { x: 130, y: 100 }, 2)).toBe(false)
  })
})
