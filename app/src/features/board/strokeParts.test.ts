import { describe, expect, it } from 'vitest'
import { lengthOf } from './pathGeometry'
import { offsetLine, strokeParts } from './strokeParts'
import { pts } from './testing'
import { DEFAULT_STYLE } from './style'

const flat = pts([0, 0], [100, 0])
const style = (extra: Partial<typeof DEFAULT_STYLE>) => ({ ...DEFAULT_STYLE, ...extra })

describe('strokeParts', () => {
  it('a solid line is the line itself', () => {
    const parts = strokeParts(flat, style({}), 1)
    expect(parts.lines).toEqual([flat])
  })

  it('a dot stays a dot whatever the type', () => {
    expect(strokeParts(pts([1, 1]), style({ type: 'dashed', part: 4, gap: 4 }), 1).lines).toEqual([pts([1, 1])])
  })

  it('dashes: the on parts are `part` long, a gap apart', () => {
    const { lines } = strokeParts(flat, style({ type: 'dashed', part: 10, gap: 10 }), 1)
    expect(lines).toHaveLength(5)
    expect(lengthOf(lines[0])).toBeCloseTo(10)
    expect(lines[1][0].x).toBeCloseTo(20)
    expect(lines.reduce((sum, l) => sum + lengthOf(l), 0)).toBeCloseTo(50)
  })

  it('dashes carry on round a corner', () => {
    const { lines } = strokeParts(pts([0, 0], [5, 0], [5, 100]), style({ type: 'dashed', part: 10, gap: 10 }), 1)
    expect(lines.some((l) => l.length === 3)).toBe(true)
  })

  it('fixed width scales the lengths by the unit', () => {
    const { lines } = strokeParts(flat, style({ type: 'dashed', part: 10, gap: 10 }), 0.5)
    expect(lengthOf(lines[0])).toBeCloseTo(5)
  })

  it('double: two lines the gap apart', () => {
    const { lines } = strokeParts(flat, style({ type: 'double', gap: 8 }), 1)
    expect(lines).toHaveLength(2)
    expect(Math.abs(lines[0][0].y - lines[1][0].y)).toBeCloseTo(8)
  })

  it('diagonal: ticks at the spacing, slanted 45°', () => {
    const { lines } = strokeParts(flat, style({ type: 'diagonal', part: 6, gap: 4 }), 1)
    expect(lines).toHaveLength(10)
    expect(lines[1][0].x + lines[1][1].x).toBeCloseTo(2 * 15, 5)
    const [a, b] = lines[0]
    expect(Math.abs(b.x - a.x)).toBeCloseTo(Math.abs(b.y - a.y))
  })

  it('a closed ring includes the closing side', () => {
    const square = pts([0, 0], [10, 0], [10, 10], [0, 10])
    const { lines } = strokeParts(square, style({ type: 'dashed', part: 100, gap: 1 }), 1, true)
    expect(lines.reduce((sum, l) => sum + lengthOf(l), 0)).toBeGreaterThan(30)
  })

  it('falls back to solid instead of cutting a line into millions of parts', () => {
    const { lines } = strokeParts(pts([0, 0], [1e6, 0]), style({ type: 'dashed', part: 1, gap: 1 }), 1)
    expect(lines).toHaveLength(1)
  })
})

describe('offsetLine', () => {
  it('moves a straight line sideways', () => {
    expect(offsetLine(pts([0, 0], [10, 0]), 2)).toEqual([{ x: 0, y: 2 }, { x: 10, y: 2 }])
  })
})
