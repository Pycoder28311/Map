import { describe, expect, it } from 'vitest'
import { cornersOf, drawLine, drawShape, isPlain, lineStylePatch, wayChange } from './drawLine'
import { lineFromStroke } from './paths'
import { PENCIL_STYLE } from './style'
import { line, pts } from './testing'

const wavy = Array.from({ length: 60 }, (_, i) => ({ x: i * 5, y: Math.round(Math.sin(i / 4) * 40) }))

describe('drawLine', () => {
  it('the plain pencil is exactly what lineFromStroke makes', () => {
    expect(drawLine(wavy, PENCIL_STYLE)).toEqual(lineFromStroke(wavy, PENCIL_STYLE, 1))
  })

  it('rounded has a handle per point and fewer points than exact', () => {
    const style = { ...PENCIL_STYLE, way: 'rounded' as const }
    const l = drawLine(wavy, style)
    expect(l.handles).toHaveLength(l.points.length)
    expect(l.points.length).toBeLessThan(drawLine(wavy, PENCIL_STYLE).points.length)
  })

  it('straight keeps only the ends; a click stays a dot', () => {
    const style = { ...PENCIL_STYLE, way: 'straight' as const }
    expect(drawLine(wavy, style).points).toEqual([wavy[0], wavy.at(-1)])
    expect(drawLine(pts([4, 4]), style).points).toEqual(pts([4, 4]))
  })

  it('corners drops the shallow turns', () => {
    const l = drawLine(pts([0, 0], [100, 0], [100, 100], [102, 150], [100, 200]), { ...PENCIL_STYLE, way: 'corners', amount: 45 })
    expect(l.points).toEqual(pts([0, 0], [100, 0], [100, 200]))
  })
})

describe('cornersOf', () => {
  it('a bigger angle keeps fewer corners', () => {
    const zig = pts([0, 0], [10, 0], [20, 5], [30, 20], [30, 40])
    expect(cornersOf(zig, 10).length).toBeGreaterThan(cornersOf(zig, 80).length)
    expect(cornersOf(zig, 80)[0]).toEqual({ x: 0, y: 0 })
  })
})

describe('wayChange', () => {
  it('to rounded generates handles, away from it drops them', () => {
    const l = line(1, pts([0, 0], [50, 40], [100, 0]))
    const rounded = wayChange(l, 'rounded')
    expect(rounded.handles).toHaveLength(3)
    expect(rounded.style?.way).toBe('rounded')
    const back = wayChange({ ...l, ...rounded, style: rounded.style! }, 'straight')
    expect(back.handles).toBeUndefined()
  })

  it('corners starts at its default degrees; the same way is no change', () => {
    const l = line(1, pts([0, 0], [10, 10]))
    expect(wayChange(l, 'corners').style?.amount).toBe(45)
    expect(wayChange(l, 'exact')).toEqual({})
  })
})

describe('drawShape', () => {
  const pen = { shape: 'ellipse' as const, param: 0, style: PENCIL_STYLE, fill: null }

  it('takes the corners whichever way it was dragged', () => {
    expect(drawShape({ x: 100, y: 80 }, { x: 40, y: 20 }, pen)?.box).toEqual({ x: 40, y: 20, w: 60, h: 60 })
  })

  it('Shift makes it square, growing away from the start', () => {
    expect(drawShape({ x: 100, y: 100 }, { x: 40, y: 90 }, pen, true)?.box).toEqual({ x: 40, y: 40, w: 60, h: 60 })
  })

  it('is nothing while it is a click', () => {
    expect(drawShape({ x: 10, y: 10 }, { x: 12, y: 30 }, pen)).toBeNull()
  })
})

describe('isPlain and lineStylePatch', () => {
  it('only the unadorned pencil is plain', () => {
    expect(isPlain(PENCIL_STYLE)).toBe(true)
    expect(isPlain({ ...PENCIL_STYLE, type: 'dashed' })).toBe(false)
    expect(isPlain({ ...PENCIL_STYLE, arrow: { start: true, end: false, style: 0, size: 8 } })).toBe(false)
  })

  it('a change of way brings its handles, another change does not', () => {
    const l = line(1, pts([0, 0], [50, 40], [100, 0]))
    expect(lineStylePatch(l, { ...l.style, color: '#ff0000' })).toEqual({ style: { ...l.style, color: '#ff0000' } })
    expect(lineStylePatch(l, { ...l.style, way: 'rounded' }).handles).toHaveLength(3)
  })
})
