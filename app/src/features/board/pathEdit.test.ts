import { describe, expect, it } from 'vitest'
import { hitPathPoint, knobsOf, moveHandle, movePoint } from './pathEdit'
import { line, pts } from './testing'

const h = (inX: number, inY: number, outX: number, outY: number) => ({ inX, inY, outX, outY })
const curve = line(1, pts([0, 0], [50, 50], [100, 0]), { handles: [h(0, 0, 10, 0), h(-20, 0, 20, 0), h(-10, 0, 0, 0)] })

describe('knobsOf', () => {
  it('puts the knobs at the offsets', () => {
    expect(knobsOf(curve, 1)).toEqual({ in: { x: 30, y: 50 }, out: { x: 70, y: 50 } })
    expect(knobsOf(line(2, pts([0, 0])), 0)).toBeNull()
  })
})

describe('hitPathPoint', () => {
  it('finds a point', () => {
    expect(hitPathPoint(curve, { x: 51, y: 49 }, 5, null)).toEqual({ kind: 'point', index: 1 })
    expect(hitPathPoint(curve, { x: 200, y: 200 }, 5, null)).toBeNull()
  })

  it('finds the knobs of the active point only', () => {
    expect(hitPathPoint(curve, { x: 70, y: 50 }, 5, 1)).toEqual({ kind: 'out', index: 1 })
    expect(hitPathPoint(curve, { x: 30, y: 50 }, 5, 1)).toEqual({ kind: 'in', index: 1 })
    expect(hitPathPoint(curve, { x: 70, y: 50 }, 5, null)).toBeNull()
  })

  it('ignores a knob with no length', () => {
    expect(hitPathPoint(curve, { x: 100, y: 0 }, 5, 2)).toEqual({ kind: 'point', index: 2 })
    expect(hitPathPoint(curve, { x: 0, y: 0 }, 5, 0)).toEqual({ kind: 'point', index: 0 })
  })
})

describe('movePoint', () => {
  it('moves one point to whole numbers and leaves the handles', () => {
    const patch = movePoint(curve, 1, { x: 60.4, y: 40.6 })
    expect(patch.points).toEqual(pts([0, 0], [60, 41], [100, 0]))
    expect(patch.handles).toBeUndefined()
  })
})

describe('moveHandle', () => {
  it('turns the other knob the opposite way (a smooth point)', () => {
    expect(moveHandle(curve, 1, 'out', { x: 60, y: 70 }, true).handles![1]).toEqual(h(-10, -20, 10, 20))
  })

  it('Alt breaks the mirror', () => {
    expect(moveHandle(curve, 1, 'out', { x: 60, y: 70 }, false).handles![1]).toEqual(h(-20, 0, 10, 20))
  })

  it('does not mirror on an end', () => {
    expect(moveHandle(curve, 0, 'out', { x: 0, y: 30 }, true).handles![0]).toEqual(h(0, 0, 0, 30))
  })

  it('leaves the other points alone', () => {
    expect(moveHandle(curve, 1, 'in', { x: 40, y: 50 }, true).handles![0]).toEqual(curve.handles![0])
  })
})
