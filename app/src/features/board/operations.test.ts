import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { boundsOf } from './bounds'
import { DUPLICATE_OFFSET, flip, moveBy, resizeTo, rotateBy } from './operations'
import { DEFAULT_STYLE } from './style'
import { border, boardOf, line, pts, text } from './testing'
import { duplicate } from './operations'

const thin = { ...DEFAULT_STYLE, thickness: 0 }
const board = () => boardOf(line(1, pts([0, 0], [100, 50]), { style: thin }), line(2, pts([20, 80], [60, 100]), { style: thin }))

describe('operations', () => {
  it('moves everything by the same amount', () => {
    const { board: b } = applyChange(board(), moveBy(board().objects, 5, -5))
    expect(b.objects.map((o) => (o.kind === 'line' ? o.points[0] : null))).toEqual([{ x: 5, y: -5 }, { x: 25, y: 75 }])
  })

  it('resizes from the bottom-left corner to any ratio', () => {
    const start = { x: 0, y: 0, w: 100, h: 100 }
    const { board: b } = applyChange(board(), resizeTo(board().objects, start, { x: 200, y: 50 }, false))
    const bounds = boundsOf(b.objects[0])
    expect(bounds.x).toBe(0)
    expect(bounds.w).toBe(200)
    expect(boundsOf(b.objects[1]).y + boundsOf(b.objects[1]).h).toBe(100) // the bottom edge (anchor) stays
  })

  it('keeps the ratio with the bigger scale', () => {
    const start = { x: 0, y: 0, w: 100, h: 100 }
    const { board: b } = applyChange(board(), resizeTo(board().objects, start, { x: 200, y: 50 }, true))
    expect(boundsOf(b.objects[0]).w).toBe(200)
    expect(boundsOf(b.objects[0]).h).toBe(100)
  })

  it('never makes the box vanish', () => {
    const start = { x: 0, y: 0, w: 100, h: 100 }
    const { board: b } = applyChange(board(), resizeTo(board().objects, start, { x: -500, y: 900 }, false))
    expect(boundsOf(b.objects[0]).w).toBeGreaterThan(0)
  })

  it('snaps a turn to 15 degrees', () => {
    const a = applyChange(board(), rotateBy(board().objects, { x: 0, y: 0 }, (14 * Math.PI) / 180, true)).board
    const b = applyChange(board(), rotateBy(board().objects, { x: 0, y: 0 }, (15 * Math.PI) / 180, false)).board
    expect(a.objects[0]).toEqual(b.objects[0])
  })

  it('mirrors about the middle of the selection', () => {
    const { board: b } = applyChange(board(), flip(board().objects, 'h'))
    expect(b.objects[0].kind === 'line' && b.objects[0].points).toEqual(pts([100, 0], [0, 50]))
  })

  it('duplicates, offset, and leaves the originals', () => {
    const { board: b, added } = applyChange(board(), duplicate(board().objects))
    expect(b.objects).toHaveLength(4)
    expect(added).toEqual([3, 4])
    const copy = b.objects[2]
    expect(copy.kind === 'line' && copy.points[0]).toEqual({ x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET })
  })
})

describe('areas keep their edge colours', () => {
  const area = border(1, pts([0, 0], [100, 0], [100, 100], [0, 100]), { style: thin, edges: [{ from: 1, color: '#00ff00' }], fill: { color: '#000000', opacity: 20 } })
  const b = boardOf(area)

  it.each([
    ['move', moveBy([area], 5, 5)],
    ['resize', resizeTo([area], boundsOf(area), { x: 200, y: 150 }, false)],
    ['rotate', rotateBy([area], { x: 50, y: 50 }, 1, false)],
    ['flip', flip([area], 'h')],
  ])('%s', (_, change) => {
    const out = applyChange(b, change).board.objects[0]
    expect(out).toMatchObject({ edges: [{ from: 1, color: '#00ff00' }], fill: { color: '#000000', opacity: 20 } })
  })
})

describe('text', () => {
  const t = text(1, { anchor: { x: 100, y: 100 }, width: 200, text: 'hello world', size: 20 })
  const b = boardOf(t)

  it('one text alone: the handle changes its width, not its letters', () => {
    const out = applyChange(b, resizeTo([t], boundsOf(t), { x: boundsOf(t).x + boundsOf(t).w * 2, y: boundsOf(t).y }, false)).board.objects[0] as typeof t
    expect(out.width).toBeGreaterThan(300)
    expect(out.size).toBe(20)
  })

  it('rotating adds to its rotation about the selection centre', () => {
    const out = applyChange(b, rotateBy([t], { x: 200, y: 110 }, Math.PI / 2, false)).board.objects[0] as typeof t
    expect(out.rotation).toBe(90)
  })

  it('a mirror moves it without mirroring its words', () => {
    const out = applyChange(b, flip([t], 'h')).board.objects[0] as typeof t
    expect(out.rotation).toBe(0)
  })

  it('scaled in a group, its size and width scale', () => {
    const other = line(2, pts([0, 0], [10, 10]), { style: thin })
    const b2 = boardOf(t, other)
    const out = applyChange(b2, resizeTo([t, other], boundsOf(t), { x: boundsOf(t).x + boundsOf(t).w * 2, y: boundsOf(t).y - boundsOf(t).h }, true)).board
    expect((out.objects[0] as typeof t).size).toBeGreaterThan(20)
  })

  it('a copy follows nothing and names nothing', () => {
    const named = text(3, { attach: 9, isName: true })
    const added = duplicate([named]).add![0] as typeof t
    expect(added.attach).toBeUndefined()
    expect(added.isName).toBeUndefined()
  })
})
