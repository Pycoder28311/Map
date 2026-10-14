import { describe, expect, it } from 'vitest'
import { borderFromCorners, borderFromShape, borderFromStroke, defaultFill, snapToBorders } from './drawBorder'
import { DEFAULT_STYLE } from './style'
import { border, boardOf, pts } from './testing'
import { SHAPE_TYPES } from './types'

describe('borderFromStroke', () => {
  it('closes a loop the pointer made and drops its last point near the first', () => {
    const loop = pts([0, 0], [50, 0], [100, 0], [100, 50], [100, 100], [50, 100], [0, 100], [0, 50], [1, 1])
    const b = borderFromStroke(loop, DEFAULT_STYLE, null)!
    expect(b.points).toEqual(pts([0, 0], [100, 0], [100, 100], [0, 100]))
    expect(b.style.way).toBe('exact')
    expect(b.kind).toBe('border')
  })

  it('is nothing for a line, a dot or a scribble in one place', () => {
    expect(borderFromStroke(pts([0, 0], [100, 0]), DEFAULT_STYLE, null)).toBeNull()
    expect(borderFromStroke(pts([5, 5]), DEFAULT_STYLE, null)).toBeNull()
    expect(borderFromStroke(pts([0, 0], [1, 1], [0, 2], [1, 0]), DEFAULT_STYLE, null)).toBeNull()
  })
})

describe('borderFromCorners', () => {
  it('keeps the corners as clicked, linear', () => {
    const b = borderFromCorners(pts([0, 0], [100, 0], [100, 100]), DEFAULT_STYLE, defaultFill(DEFAULT_STYLE))!
    expect(b.points).toHaveLength(3)
    expect(b.style.way).toBe('straight')
    expect(b.fill).toEqual({ color: DEFAULT_STYLE.color, opacity: 20 })
  })

  it('needs three', () => {
    expect(borderFromCorners(pts([0, 0], [100, 0]), DEFAULT_STYLE, null)).toBeNull()
  })
})

describe('borderFromShape', () => {
  it.each(SHAPE_TYPES)('%s makes a closed border of whole numbers', (shape) => {
    const b = borderFromShape({ x: 10, y: 10, w: 120, h: 80 }, shape, 5, DEFAULT_STYLE, null)!
    expect(b.points.length).toBeGreaterThanOrEqual(3)
    expect(b.points.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true)
  })
})

describe('snapToBorders', () => {
  const board = boardOf(border(1, pts([0, 0], [100, 0], [100, 100], [0, 100])))

  it('moves points near an area onto its corner or edge', () => {
    expect(snapToBorders(pts([101, 1], [50, 3], [300, 300]), board, 5)).toEqual(pts([100, 0], [50, 0], [300, 300]))
  })

  it('leaves everything when there is no area', () => {
    expect(snapToBorders(pts([1, 1]), boardOf(), 5)).toEqual(pts([1, 1]))
  })
})
