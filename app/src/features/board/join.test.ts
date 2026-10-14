import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { findJunction, joinLines, reversed } from './join'
import { boardOf, line, pts } from './testing'

const a = line(1, pts([0, 0], [50, 0], [100, 0]))
const b = line(2, pts([101, 1], [150, 50]))
const far = line(3, pts([400, 400], [500, 500]))

describe('findJunction', () => {
  it('finds two ends that touch, at the pointer', () => {
    const j = findJunction(boardOf(a, b, far), { x: 100, y: 0 }, 6)!
    expect([j.a.id, j.b.id].sort()).toEqual([1, 2])
    expect(j.at).toEqual({ x: 101, y: 1 })
  })

  it('needs the pointer near and the ends touching', () => {
    expect(findJunction(boardOf(a, b), { x: 300, y: 300 }, 6)).toBeNull()
    expect(findJunction(boardOf(a, far), { x: 100, y: 0 }, 6)).toBeNull()
    expect(findJunction(boardOf(a, line(4, pts([120, 0], [150, 0]))), { x: 100, y: 0 }, 30)).toBeNull()
  })

  it('does not join a line to itself', () => {
    const loop = line(5, pts([0, 0], [50, 50], [1, 1]))
    expect(findJunction(boardOf(loop), { x: 0, y: 0 }, 6)).toBeNull()
  })
})

describe('joinLines', () => {
  it('makes one line of two, in one change', () => {
    const board = boardOf(a, b)
    const j = findJunction(board, { x: 100, y: 0 }, 6)!
    const { change, id } = joinLines(j)
    const out = applyChange(board, change).board
    expect(out.objects).toHaveLength(1)
    expect(out.objects[0].id).toBe(id)
    expect((out.objects[0] as typeof a).points).toHaveLength(4)
  })

  it('turns a line round when its ends meet start to start', () => {
    const c = line(6, pts([0, 0], [50, 50]))
    const d = line(7, pts([1, 1], [-50, 80]))
    const { change } = joinLines({ a: c, aEnd: 'start', b: d, bEnd: 'start', at: { x: 0, y: 0 } })
    expect(change.update![0].patch.points).toEqual(pts([50, 50], [0, 0], [-50, 80]))
  })

  it('keeps the links of both, once', () => {
    const l1 = line(1, pts([0, 0], [10, 0]), { links: [{ to: 'sidebar', id: 'n1' }, { to: 'sidebar', id: 'n2' }] })
    const l2 = line(2, pts([10, 0], [20, 0]), { links: [{ to: 'sidebar', id: 'n2' }, { to: 'sidebar', id: 'n3' }] })
    const { change } = joinLines({ a: l1, aEnd: 'end', b: l2, bEnd: 'start', at: { x: 10, y: 0 } })
    expect(change.update![0].patch.links).toHaveLength(3)
  })

  it('carries handles through, filling in a straight side', () => {
    const h = { inX: 0, inY: 0, outX: 5, outY: 5 }
    const l1 = line(1, pts([0, 0], [10, 0]), { handles: [h, { ...h, inX: -3 }] })
    const l2 = line(2, pts([10, 0], [20, 0]))
    const { change } = joinLines({ a: l1, aEnd: 'end', b: l2, bEnd: 'start', at: { x: 10, y: 0 } })
    expect(change.update![0].patch.handles).toHaveLength(3)
  })
})

describe('reversed', () => {
  it('swaps each handle side as well', () => {
    const r = reversed(line(1, pts([0, 0], [10, 0]), { handles: [{ inX: 1, inY: 2, outX: 3, outY: 4 }, { inX: 5, inY: 6, outX: 7, outY: 8 }] }))
    expect(r.points).toEqual(pts([10, 0], [0, 0]))
    expect(r.handles![0]).toEqual({ inX: 7, inY: 8, outX: 5, outY: 6 })
  })
})
