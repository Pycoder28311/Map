import { describe, expect, it } from 'vitest'
import { eraseChange, eraseFromPath, eraseObject } from './erase'
import { border, line, pts } from './testing'

const road = pts([0, 0], [200, 0])

describe('eraseFromPath', () => {
  it('cuts the middle in two pieces', () => {
    const pieces = eraseFromPath(road, [{ x: 100, y: 0 }], 10)
    expect(pieces).toHaveLength(2)
    expect(pieces[0][0]).toEqual({ x: 0, y: 0 })
    expect(pieces[0].at(-1)!.x).toBeLessThan(100)
    expect(pieces[1][0].x).toBeGreaterThan(100)
    expect(pieces[1].at(-1)).toEqual({ x: 200, y: 0 })
  })

  it('shortens from an end', () => {
    const pieces = eraseFromPath(road, [{ x: 0, y: 0 }], 10)
    expect(pieces).toHaveLength(1)
    expect(pieces[0][0].x).toBeGreaterThan(0)
  })

  it('leaves nothing when all is covered, and the path as it is on a miss', () => {
    expect(eraseFromPath(road, [{ x: 100, y: 0 }], 150)).toEqual([])
    expect(eraseFromPath(road, [{ x: 100, y: 50 }], 10)[0]).toBe(road)
  })

  it('does not let a long segment step over the circle', () => {
    expect(eraseFromPath(pts([0, 0], [10000, 0]), [{ x: 5000, y: 0 }], 3)).toHaveLength(2)
  })
})

describe('eraseChange', () => {
  it('keeps the object when one piece is left, removes it when none, swaps it for several', () => {
    const l = line(7, road)
    expect(eraseChange(l, [l.points])).toEqual({})
    expect(eraseChange(l, [pts([0, 0], [50, 0])]).update?.[0].id).toBe(7)
    expect(eraseChange(l, [])).toEqual({ remove: [7], add: [] })
    const swapped = eraseChange(l, [pts([0, 0], [10, 0]), pts([90, 0], [200, 0])])
    expect(swapped.remove).toEqual([7])
    expect(swapped.add).toHaveLength(2)
  })
})

describe('eraseChange on a curved line', () => {
  it('flattens it: the pieces are plain exact lines', () => {
    const base = line(7, road)
    const curved = { ...base, style: { ...base.style, way: 'rounded' as const }, handles: [{ inX: 0, inY: 0, outX: 0, outY: 5 }, { inX: 0, inY: 5, outX: 0, outY: 0 }] }
    const change = eraseChange(curved, [pts([0, 0], [10, 0]), pts([90, 0], [100, 0])])
    expect(change.add).toHaveLength(2)
    expect(change.add![0]).toMatchObject({ handles: undefined, style: { way: 'exact', amount: 0 } })
  })
})

describe('eraseObject on a border', () => {
  const area = border(3, pts([0, 0], [100, 0], [100, 100], [0, 100]), { name: 'A' })

  it('turns what is left of the outline into lines', () => {
    const change = eraseObject(area, [{ x: 50, y: 0 }], 10)
    expect(change.remove).toEqual([3])
    expect(change.add!.every((d) => d.kind === 'line')).toBe(true)
    expect(change.add![0]).toMatchObject({ name: 'A' })
  })

  it('is no change when the circle misses it', () => {
    expect(eraseObject(area, [{ x: 500, y: 500 }], 10)).toEqual({})
  })
})
