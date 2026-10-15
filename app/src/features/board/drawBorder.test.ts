import { describe, expect, it } from 'vitest'
import { areaAt, mergeBorders } from './borders'
import { decodeBoard, encodeBoard } from './boardCodec'
import { hitPart } from './hit'
import { isClosed } from './pathGeometry'
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

  it('leaves the ends apart when the pointer did not come back: an open border, a line', () => {
    const b = borderFromStroke(pts([0, 0], [100, 0], [100, 100]), DEFAULT_STYLE, null)!
    expect(b.open).toBe(true)
    expect(b.points).toHaveLength(3)
    expect(borderFromStroke(pts([0, 0], [100, 0]), DEFAULT_STYLE, null)!.open).toBe(true)
  })

  it('joins them when the pointer ends within the distance it is given of the start', () => {
    const almost = pts([0, 0], [100, 0], [100, 100], [0, 100], [2, 8])
    expect(borderFromStroke(almost, DEFAULT_STYLE, null)!.open).toBe(true)
    const closed = borderFromStroke(almost, DEFAULT_STYLE, null, 10)!
    expect(closed.open).toBeUndefined()
    expect(closed.points).toHaveLength(4)
  })

  it('is nothing for a dot or a scribble in one place', () => {
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

  it('is open unless the first corner was clicked again, and an area needs three corners', () => {
    expect(borderFromCorners(pts([0, 0], [100, 0], [100, 100]), DEFAULT_STYLE, null)!.open).toBe(true)
    expect(borderFromCorners(pts([0, 0], [100, 0], [100, 100]), DEFAULT_STYLE, null, true)!.open).toBeUndefined()
    expect(borderFromCorners(pts([0, 0], [100, 0]), DEFAULT_STYLE, null)!.open).toBe(true)
    expect(borderFromCorners(pts([0, 0], [100, 0]), DEFAULT_STYLE, null, true)).toBeNull()
    expect(borderFromCorners(pts([0, 0]), DEFAULT_STYLE, null)).toBeNull()
  })
})

describe('borderFromShape', () => {
  it.each(SHAPE_TYPES)('%s makes a closed border of whole numbers', (shape) => {
    const b = borderFromShape({ x: 10, y: 10, w: 120, h: 80 }, shape, 5, DEFAULT_STYLE, null)!
    expect(b.points.length).toBeGreaterThanOrEqual(3)
    expect(b.points.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true)
  })
})

describe('an open border', () => {
  const open = border(2, pts([0, 0], [100, 0], [100, 100]), { open: true })

  it('is not an area: it is not closed, has no inside to hit, and nothing merges with it', () => {
    expect(isClosed(open)).toBe(false)
    expect(isClosed(border(1, pts([0, 0], [100, 0], [100, 100])))).toBe(true)
    expect(hitPart(open, { x: 20, y: 80 }, 2)).toBeNull()
    expect(hitPart(open, { x: 50, y: 0 }, 2)).toBe('edge')
    // The missing closing edge is not there to be hit
    expect(hitPart(open, { x: 50, y: 50 }, 2)).toBeNull()
    expect(areaAt(boardOf(open), { x: 80, y: 20 })).toBeNull()
    const drawn = { ...border(0, pts([50, -10], [150, -10], [150, 10], [50, 10])), id: undefined } as never
    expect(mergeBorders(boardOf(open), drawn, 5).id).toBeNull()
    expect(mergeBorders(boardOf(), { ...(drawn as object), open: true } as never, 5).change.add).toHaveLength(1)
  })

  it('keeps being open through the board file', () => {
    const board = boardOf(open)
    expect(decodeBoard(encodeBoard(board)).objects[0]).toMatchObject({ kind: 'border', open: true })
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
