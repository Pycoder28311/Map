import { describe, expect, it } from 'vitest'
import { autoHandles, cubicAt, cubicOf, flatten, nearestOnCurve, splitCubic } from './bezier'
import { pts } from './testing'

const zero = { inX: 0, inY: 0, outX: 0, outY: 0 }

describe('flatten', () => {
  it('leaves a straight path as it is', () => {
    expect(flatten(pts([0, 0], [10, 0], [10, 10]))).toEqual(pts([0, 0], [10, 0], [10, 10]))
    expect(flatten(pts([0, 0], [10, 0]), [zero, zero])).toEqual(pts([0, 0], [10, 0]))
  })

  it('samples a curved segment and keeps the ends exact', () => {
    const path = flatten(pts([0, 0], [100, 0]), [{ ...zero, outY: 50 }, { ...zero, inY: 50 }])
    expect(path.length).toBeGreaterThan(4)
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path.at(-1)).toEqual({ x: 100, y: 0 })
    expect(Math.max(...path.map((p) => p.y))).toBeGreaterThan(20)
  })

  it('includes the closing segment of a closed path without repeating the start', () => {
    const path = flatten(pts([0, 0], [10, 0], [10, 10]), undefined, true)
    expect(path).toEqual(pts([0, 0], [10, 0], [10, 10]))
    const curved = flatten(pts([0, 0], [10, 0], [10, 10]), [zero, zero, { ...zero, outX: -20 }], true)
    expect(curved.length).toBeGreaterThan(3)
    expect(curved.at(-1)).not.toEqual({ x: 0, y: 0 })
  })

  it('leaves one point alone', () => {
    expect(flatten(pts([3, 4]))).toEqual(pts([3, 4]))
  })
})

describe('splitCubic', () => {
  it('cuts a cubic into two that meet at the curve', () => {
    const cubic = cubicOf(pts([0, 0], [100, 0]), [{ ...zero, outY: 50 }, { ...zero, inY: 50 }], 0)!
    const [a, b] = splitCubic(cubic, 0.3)
    const at = cubicAt(cubic, 0.3)
    expect(a[3].x).toBeCloseTo(at.x)
    expect(a[3].y).toBeCloseTo(at.y)
    expect(b[0]).toEqual(a[3])
    expect(cubicAt(b, 1)).toEqual(cubic[3])
    expect(cubicAt(a, 0.5).x).toBeCloseTo(cubicAt(cubic, 0.15).x)
  })
})

describe('nearestOnCurve', () => {
  it('finds the place on a straight segment', () => {
    const near = nearestOnCurve(pts([0, 0], [100, 0]), undefined, { x: 40, y: 10 })
    expect(near).toMatchObject({ segment: 0, point: { x: 40, y: 0 }, distance: 10 })
  })

  it('finds the place on a bulging curve', () => {
    const handles = [{ ...zero, outY: 60 }, { ...zero, inY: 60 }]
    const top = cubicAt(cubicOf(pts([0, 0], [100, 0]), handles, 0)!, 0.5)
    const near = nearestOnCurve(pts([0, 0], [100, 0]), handles, { x: top.x, y: top.y + 5 })
    expect(near.distance).toBeLessThan(5.1)
    expect(near.t).toBeCloseTo(0.5, 1)
  })
})

describe('autoHandles', () => {
  it('gives a handle per point, none on the free side of the ends', () => {
    const handles = autoHandles(pts([0, 0], [60, 60], [120, 0]))
    expect(handles).toHaveLength(3)
    expect(handles[0]).toMatchObject({ inX: 0, inY: 0 })
    expect(handles[2]).toMatchObject({ outX: 0, outY: 0 })
    expect(handles[1].inX).toBe(-handles[1].outX)
    expect(handles[1].outX).toBe(20)
  })

  it('gives a straight run zero-length turn', () => {
    const handles = autoHandles(pts([0, 0], [60, 0], [120, 0]))
    expect(handles[1].outY).toBe(0)
  })
})
