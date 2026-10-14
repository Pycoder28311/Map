import { describe, expect, it } from 'vitest'
import { splitBorder, splitLine } from './split'
import { border, line, pts } from './testing'

describe('splitLine', () => {
  it('cuts at a point of the line, both halves keep it', () => {
    const l = line(1, pts([0, 0], [50, 0], [100, 0]), { name: 'Road', links: [{ to: 'sidebar', id: 'n1' }] })
    const [a, b] = splitLine(l, { x: 50, y: 4 })!
    expect(a.points).toEqual(pts([0, 0], [50, 0]))
    expect(b.points).toEqual(pts([50, 0], [100, 0]))
    expect(a.name).toBe('Road')
    expect(b.links).toEqual(l.links)
    expect('id' in a).toBe(false)
  })

  it('adds a point where a segment is cut', () => {
    const [a, b] = splitLine(line(1, pts([0, 0], [100, 0])), { x: 30, y: 9 })!
    expect(a.points).toEqual(pts([0, 0], [30, 0]))
    expect(b.points).toEqual(pts([30, 0], [100, 0]))
  })

  it('does nothing at an end or for a dot', () => {
    expect(splitLine(line(1, pts([0, 0], [100, 0])), { x: -20, y: 0 })).toBeNull()
    expect(splitLine(line(1, pts([0, 0], [100, 0])), { x: 400, y: 0 })).toBeNull()
    expect(splitLine(line(1, pts([5, 5])), { x: 5, y: 5 })).toBeNull()
  })

  it('cuts the handles with the points', () => {
    const h = (n: number) => ({ inX: n, inY: 0, outX: n, outY: 0 })
    const [a, b] = splitLine(line(1, pts([0, 0], [50, 0], [100, 0]), { handles: [h(1), h(2), h(3)] }), { x: 50, y: 0 })!
    expect(a.handles).toEqual([h(1), h(2)])
    expect(b.handles).toEqual([h(2), h(3)])
  })
})

describe('splitLine on a curve', () => {
  const curved = line(1, pts([0, 0], [100, 0]), { handles: [{ inX: 0, inY: 0, outX: 0, outY: 60 }, { inX: 0, inY: 60, outX: 0, outY: 0 }] })

  it('cuts the curve so both halves keep its shape', () => {
    const [a, b] = splitLine(curved, { x: 50, y: 45 })!
    expect(a.points).toHaveLength(2)
    expect(b.points).toHaveLength(2)
    expect(a.points[1]).toEqual(b.points[0])
    expect(a.handles).toHaveLength(2)
    expect(a.handles![0].outY).toBeGreaterThan(0)
    expect(b.handles![0].outX).not.toBe(0)
    expect(a.handles![1].outX).toBe(0)
    expect(b.handles![0].inX).toBe(0)
  })
})

describe('splitBorder', () => {
  const square = border(1, pts([0, 0], [100, 0], [100, 100], [0, 100]), { name: 'Area', links: [{ to: 'sidebar', id: 'n1' }], fill: { color: '#000000', opacity: 20 } })

  it('opens the outline into a line that starts and ends at the cut', () => {
    const l = splitBorder(square, { x: 50, y: 0 })!
    expect(l.kind).toBe('line')
    expect(l.points[0]).toEqual({ x: 50, y: 0 })
    expect(l.points.at(-1)).toEqual({ x: 50, y: 0 })
    expect(l.points).toHaveLength(6)
    expect(l.name).toBe('Area')
    expect(l.links).toHaveLength(1)
    expect('fill' in l).toBe(false)
  })

  it('cuts at a corner when that is nearest', () => {
    const l = splitBorder(square, { x: 101, y: 101 })!
    expect(l.points[0]).toEqual({ x: 100, y: 100 })
    expect(l.points).toHaveLength(5)
  })
})
