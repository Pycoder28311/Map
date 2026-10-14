import { POINT_DEFAULT } from './pointLabels'
import { describe, expect, it } from 'vitest'
import { apply, compose, flipAbout, rotateAbout, scaleAbout, transformObject, translate } from './transform'
import { line, pts, shape } from './testing'
import type { PointObject } from './types'

const P = { x: 10, y: 20 }

describe('matrices', () => {
  it('scale about a corner keeps that corner', () => {
    expect(apply(scaleAbout({ x: 5, y: 5 }, 3, 2), { x: 5, y: 5 })).toEqual({ x: 5, y: 5 })
    expect(apply(scaleAbout({ x: 5, y: 5 }, 3, 2), { x: 6, y: 6 })).toEqual({ x: 8, y: 7 })
  })

  it('four quarter turns come back', () => {
    let m = rotateAbout({ x: 50, y: 50 }, Math.PI / 2)
    m = compose(m, compose(m, compose(m, m)))
    const back = apply(m, P)
    expect(back.x).toBeCloseTo(P.x)
    expect(back.y).toBeCloseTo(P.y)
  })

  it('flipping twice is nothing', () => {
    const m = compose(flipAbout('h', { x: 30, y: 0 }), flipAbout('h', { x: 30, y: 0 }))
    expect(apply(m, P)).toEqual(P)
    expect(apply(flipAbout('v', { x: 0, y: 30 }), P)).toEqual({ x: 10, y: 40 })
  })
})

describe('transformObject', () => {
  it('gives whole numbers', () => {
    const t = transformObject(line(1, pts([1, 1], [2, 2])), scaleAbout({ x: 0, y: 0 }, 1.5, 1.5))
    expect(t.points).toEqual(pts([2, 2], [3, 3]))
  })

  it('moves handles by the turn and scale only, not the move', () => {
    const l = line(1, pts([0, 0], [10, 0]), { handles: [{ inX: 0, inY: 0, outX: 10, outY: 0 }, { inX: -10, inY: 0, outX: 0, outY: 0 }] })
    const t = transformObject(l, compose(translate(100, 100), rotateAbout({ x: 0, y: 0 }, Math.PI / 2)))
    expect(t.handles![0]).toEqual({ inX: 0, inY: 0, outX: 0, outY: 10 })
    expect(t.points[0]).toEqual({ x: 100, y: 100 })
  })

  it('moves a shape and scales its box along its own axes', () => {
    const t = transformObject(shape(1), compose(translate(10, 10), scaleAbout({ x: 0, y: 0 }, 2, 2)))
    expect(t.box).toEqual({ x: 10, y: 10, w: 200, h: 100 })
    expect(t.rotation).toBe(0)
  })

  it('moves the anchor of a point', () => {
    const p: PointObject = { id: 1, kind: 'point', layer: 1, name: '', links: [], anchor: { x: 5, y: 5 }, ...POINT_DEFAULT }
    expect(transformObject(p, translate(3, -2)).anchor).toEqual({ x: 8, y: 3 })
  })
})
