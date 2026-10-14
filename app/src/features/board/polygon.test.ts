import { describe, expect, it } from 'vitest'
import { areaOf, closestOnSegment, containsPoint, segmentIntersection, signedArea, snapToRing, unionPolygons, type Ring } from './polygon'
import { pts } from './testing'

const square = (x: number, y: number, size: number): Ring => pts([x, y], [x + size, y], [x + size, y + size], [x, y + size])
const TOL = 1

describe('basics', () => {
  it('area and winding', () => {
    expect(signedArea(square(0, 0, 10))).toBe(100)
    expect(signedArea([...square(0, 0, 10)].reverse())).toBe(-100)
    expect(areaOf([...square(0, 0, 10)].reverse())).toBe(100)
  })

  it('contains a point', () => {
    expect(containsPoint(square(0, 0, 10), { x: 5, y: 5 })).toBe(true)
    expect(containsPoint(square(0, 0, 10), { x: 15, y: 5 })).toBe(false)
  })

  it('finds where segments cross', () => {
    expect(segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 })?.point).toEqual({ x: 5, y: 5 })
    expect(segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 })).toBeNull()
    expect(segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: -1 }, { x: 5, y: 1 })).toBeNull()
  })

  it('closest point on a segment', () => {
    expect(closestOnSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toMatchObject({ t: 0.5, distance: 3 })
  })

  it('snaps to a vertex before an edge, and not when far', () => {
    const s = square(0, 0, 10)
    expect(snapToRing({ x: 0.5, y: 0.4 }, s, 1)).toEqual({ x: 0, y: 0 })
    expect(snapToRing({ x: 5, y: 0.6 }, s, 1)).toEqual({ x: 5, y: 0 })
    expect(snapToRing({ x: 5, y: 5 }, s, 1)).toBeNull()
  })
})

describe('unionPolygons', () => {
  const area = (r: { ring: Ring }) => areaOf(r.ring)

  it('two overlapping squares make one outline with both origins', () => {
    const u = unionPolygons(square(0, 0, 10), square(5, 5, 10), TOL)!
    expect(area(u)).toBeCloseTo(100 + 100 - 25)
    expect(u.ring).toHaveLength(8)
    expect(new Set(u.origin)).toEqual(new Set(['a', 'b']))
    expect(u.origin).toHaveLength(u.ring.length)
  })

  it('two squares sharing a whole edge become one rectangle', () => {
    const u = unionPolygons(square(0, 0, 10), square(10, 0, 10), TOL)!
    expect(area(u)).toBeCloseTo(200)
    expect(new Set(u.origin)).toEqual(new Set(['a', 'b']))
  })

  it('a shared part of an edge', () => {
    const u = unionPolygons(square(0, 0, 10), pts([10, 3], [20, 3], [20, 8], [10, 8]), TOL)!
    expect(area(u)).toBeCloseTo(100 + 50)
  })

  it('squares that only nearly touch are snapped and merged', () => {
    const u = unionPolygons(square(0, 0, 10), pts([10.6, 0.4], [20, 0], [20, 10], [10.5, 10.3]), TOL)!
    expect(area(u)).toBeGreaterThan(190)
    expect(area(u)).toBeLessThan(205)
  })

  it('the winding of the inputs does not matter', () => {
    const u = unionPolygons([...square(0, 0, 10)].reverse(), square(5, 5, 10), TOL)!
    expect(area(u)).toBeCloseTo(175)
    expect(signedArea(u.ring)).toBeGreaterThan(0)
  })

  it('a concave L with a square across its notch', () => {
    const L = pts([0, 0], [20, 0], [20, 10], [10, 10], [10, 20], [0, 20])
    const u = unionPolygons(L, square(8, 8, 8), TOL)!
    expect(area(u)).toBeGreaterThan(areaOf(L))
    expect(area(u)).toBeLessThan(areaOf(L) + 64)
  })

  it('apart, inside, corner only: null', () => {
    expect(unionPolygons(square(0, 0, 10), square(50, 50, 10), TOL)).toBeNull()
    expect(unionPolygons(square(0, 0, 20), square(5, 5, 5), TOL)).toBeNull()
    expect(unionPolygons(square(0, 0, 10), square(10, 10, 10), TOL)).toBeNull()
  })

  it('identical rings: the same area', () => {
    const u = unionPolygons(square(0, 0, 10), square(0, 0, 10), TOL)
    if (u) expect(area(u)).toBeCloseTo(100)
  })

  it('a result with a hole is not merged', () => {
    const c = pts([0, 0], [30, 0], [30, 10], [10, 10], [10, 20], [30, 20], [30, 30], [0, 30])
    const bar = pts([25, 8], [35, 8], [35, 22], [25, 22])
    expect(unionPolygons(c, bar, TOL)).toBeNull()
  })

  it('a band across a square is one outline (a cross)', () => {
    const u = unionPolygons(square(0, 0, 30), pts([-5, 10], [35, 10], [35, 20], [-5, 20]), TOL)!
    expect(area(u)).toBeCloseTo(900 + 400 - 300)
  })

  it('every edge of the result has an origin and the result is closed and simple', () => {
    const u = unionPolygons(square(0, 0, 10), square(5, -5, 10), TOL)!
    expect(u.origin.every((o) => o === 'a' || o === 'b')).toBe(true)
    expect(areaOf(u.ring)).toBeCloseTo(175)
  })
})

describe('tags', () => {
  it('each edge of the union carries the tag of the edge it came from', () => {
    const u = unionPolygons(square(0, 0, 10), square(5, 5, 10), TOL, ['red', 'red', 'red', 'red'], ['blue', 'blue', 'blue', 'blue'])!
    expect(u.tags).toHaveLength(u.ring.length)
    expect(u.tags.every((t, i) => t === (u.origin[i] === 'a' ? 'red' : 'blue'))).toBe(true)
    expect(new Set(u.tags)).toEqual(new Set(['red', 'blue']))
  })

  it('stay with their edges when a ring is given clockwise', () => {
    const cw = [...square(0, 0, 10)].reverse()
    const u = unionPolygons(cw, square(5, 5, 10), TOL, ['x', 'x', 'x', 'x'], ['y', 'y', 'y', 'y'])!
    expect(u.tags.every((t, i) => t === (u.origin[i] === 'a' ? 'x' : 'y'))).toBe(true)
  })
})
