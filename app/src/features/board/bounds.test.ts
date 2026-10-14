import { describe, expect, it } from 'vitest'
import { boundsIntersect, boundsOf, rectFrom, unionBounds } from './bounds'
import { line, pts, shape, text } from './testing'
import { DEFAULT_STYLE } from './style'

describe('boundsOf', () => {
  it('pads a path by half its thickness', () => {
    const l = line(1, pts([10, 20], [50, 60]), { style: { ...DEFAULT_STYLE, thickness: 4 } })
    expect(boundsOf(l)).toEqual({ x: 8, y: 18, w: 44, h: 44 })
  })

  it('is the box of an upright shape', () => {
    expect(boundsOf(shape(1, { style: { ...DEFAULT_STYLE, thickness: 0 } }))).toEqual({ x: 0, y: 0, w: 100, h: 50 })
  })

  it('is the box around a turned shape', () => {
    const r = boundsOf(shape(1, { rotation: 90, style: { ...DEFAULT_STYLE, thickness: 0 } }))
    expect(r.w).toBeCloseTo(50)
    expect(r.h).toBeCloseTo(100)
    expect(r.x).toBeCloseTo(25)
    expect(r.y).toBeCloseTo(-25)
  })
})

describe('unionBounds / boundsIntersect / rectFrom', () => {
  it('joins rectangles, and null for none', () => {
    expect(unionBounds([])).toBeNull()
    const a = line(1, pts([0, 0], [10, 10]), { style: { ...DEFAULT_STYLE, thickness: 0 } })
    const b = line(2, pts([20, 5], [30, 40]), { style: { ...DEFAULT_STYLE, thickness: 0 } })
    expect(unionBounds([a, b])).toEqual({ x: 0, y: 0, w: 30, h: 40 })
  })

  it('knows when rectangles touch', () => {
    expect(boundsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 10, w: 5, h: 5 })).toBe(true)
    expect(boundsIntersect({ x: 0, y: 0, w: 10, h: 10 }, { x: 11, y: 0, w: 5, h: 5 })).toBe(false)
  })

  it('makes a rectangle from two corners either way round', () => {
    expect(rectFrom({ x: 10, y: 20 }, { x: 4, y: 30 })).toEqual({ x: 4, y: 20, w: 6, h: 10 })
  })
})

describe('curves', () => {
  it('a curve is as tall as its bulge', () => {
    const l = line(1, pts([0, 0], [100, 0]), { handles: [{ inX: 0, inY: 0, outX: 0, outY: 60 }, { inX: 0, inY: 60, outX: 0, outY: 0 }] })
    expect(boundsOf(l).h).toBeGreaterThan(30)
  })

  it('an arrow adds room at the ends', () => {
    const plain = line(1, pts([0, 0], [100, 0]))
    const arrow = line(2, pts([0, 0], [100, 0]), { style: { ...plain.style, arrow: { start: false, end: true, style: 0, size: 20 } } })
    expect(boundsOf(arrow).w).toBeGreaterThan(boundsOf(plain).w)
  })
})

describe('text', () => {
  it('is as wide as it wraps, or as its longest line', () => {
    expect(boundsOf(text(1, { width: 200, text: 'hi' })).w).toBe(200)
    expect(boundsOf(text(2, { text: 'hello' })).w).toBeGreaterThan(20)
    expect(boundsOf(text(3, { text: 'a\nb\nc' })).h).toBeGreaterThan(boundsOf(text(4, { text: 'a' })).h * 2)
  })

  it('turned, its bounds are those of the turned box', () => {
    const flat = boundsOf(text(1, { width: 200, text: 'hi' }))
    const turned = boundsOf(text(2, { width: 200, text: 'hi', rotation: 90 }))
    expect(turned.h).toBeCloseTo(flat.w)
    expect(turned.w).toBeCloseTo(flat.h)
  })
})
