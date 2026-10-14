import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { areaAt, colourRuns, edgeColours, edgeRuns, labelPoint, mergeBorders, wrapWords } from './borders'
import { containsPoint } from './polygon'
import { border, boardOf, pts } from './testing'
import { DEFAULT_STYLE } from './style'
import type { BorderObject } from './types'

const square = (x: number, y: number, size: number) => pts([x, y], [x + size, y], [x + size, y + size], [x, y + size])
const red = { ...DEFAULT_STYLE, color: '#ff0000' }
const blue = { ...DEFAULT_STYLE, color: '#0000ff' }
const drawn = (points: ReturnType<typeof square>, style = DEFAULT_STYLE): Omit<BorderObject, 'id'> => {
  const { id, ...rest } = border(0, points, { style })
  void id
  return rest
}

describe('areaAt', () => {
  it('is the topmost area under the point', () => {
    const board = boardOf(border(1, square(0, 0, 100)), border(2, square(20, 20, 40)))
    expect(areaAt(board, { x: 30, y: 30 })?.id).toBe(2)
    expect(areaAt(board, { x: 80, y: 80 })?.id).toBe(1)
    expect(areaAt(board, { x: 200, y: 200 })).toBeNull()
  })
})

describe('labelPoint', () => {
  it('is the middle of a square', () => {
    expect(labelPoint(square(0, 0, 10))).toEqual({ x: 5, y: 5 })
  })

  it('is inside a C whose centre of mass is outside it', () => {
    const c = pts([0, 0], [30, 0], [30, 10], [10, 10], [10, 20], [30, 20], [30, 30], [0, 30])
    expect(containsPoint(c, labelPoint(c))).toBe(true)
    const crescent = pts([0, 0], [40, 0], [40, 5], [5, 5], [5, 35], [40, 35], [40, 40], [0, 40])
    expect(containsPoint(crescent, labelPoint(crescent))).toBe(true)
  })
})

describe('wrapWords', () => {
  it('breaks at spaces and keeps a long word whole', () => {
    expect(wrapWords('one two three four', 9)).toEqual(['one two', 'three', 'four'])
    expect(wrapWords('extraordinarily short', 5)).toEqual(['extraordinarily', 'short'])
    expect(wrapWords('a\nb', 10)).toEqual(['a', 'b'])
  })
})

describe('edge colours', () => {
  it('runs and colours go back and forth', () => {
    const b = border(1, square(0, 0, 10), { edges: [{ from: 1, color: '#00ff00' }, { from: 3, color: '#0000ff' }] })
    const colours = edgeColours(b)
    expect(colours).toEqual([b.style.color, '#00ff00', '#00ff00', '#0000ff'])
    expect(edgeRuns(colours, b.style.color)).toEqual(b.edges)
    expect(edgeRuns([b.style.color, b.style.color], b.style.color)).toEqual([])
  })
})

describe('mergeBorders', () => {
  it('adds the drawn border when nothing is near', () => {
    const board = boardOf(border(1, square(0, 0, 10)))
    const { change, id } = mergeBorders(board, drawn(square(100, 100, 10)), 2)
    expect(id).toBeNull()
    expect(change.add).toHaveLength(1)
  })

  it('merges an overlapping border into the existing one, keeping its identity, in one change', () => {
    const board = boardOf(border(7, square(0, 0, 100), { name: 'Old', style: red, links: [{ to: 'sidebar', id: 'n1' }] }))
    const { change, id } = mergeBorders(board, drawn(square(50, 50, 100), blue), 2)
    expect(id).toBe(7)
    const out = applyChange(board, change).board
    expect(out.objects).toHaveLength(1)
    const merged = out.objects[0] as BorderObject
    expect(merged.name).toBe('Old')
    expect(merged.points.length).toBeGreaterThanOrEqual(8)
    // Both colours are on the outline
    const colours = new Set(edgeColours(merged))
    expect(colours).toEqual(new Set(['#ff0000', '#0000ff']))
  })

  it('three areas become one, the lowest id surviving, links merged once', () => {
    const board = boardOf(
      border(1, square(0, 0, 60), { links: [{ to: 'sidebar', id: 'a' }] }),
      border(2, square(100, 0, 60), { links: [{ to: 'sidebar', id: 'a' }, { to: 'sidebar', id: 'b' }] }),
    )
    const { change, id } = mergeBorders(board, drawn(square(40, 10, 80)), 2)
    expect(id).toBe(1)
    const out = applyChange(board, change).board
    expect(out.objects.map((o) => o.id)).toEqual([1])
    expect(out.objects[0].links).toHaveLength(2)
  })

  it('leaves an island inside an area, and a far one, alone', () => {
    const board = boardOf(border(1, square(0, 0, 100)), border(2, square(500, 500, 10)))
    expect(mergeBorders(board, drawn(square(20, 20, 10)), 2).id).toBeNull()
  })

  it('merges a neighbour that shares an edge', () => {
    const board = boardOf(border(1, square(0, 0, 100), { style: red }))
    const { change, id } = mergeBorders(board, drawn(square(100, 0, 100), blue), 2)
    expect(id).toBe(1)
    const merged = applyChange(board, change).board.objects[0] as BorderObject
    expect(new Set(edgeColours(merged))).toEqual(new Set(['#ff0000', '#0000ff']))
  })
})

describe('colourRuns', () => {
  it('cuts the outline where the colour changes, the last run closing on the first point', () => {
    const ring = square(0, 0, 10)
    const runs = colourRuns(ring, ['#f00', '#f00', '#00f', '#00f'])
    expect(runs).toEqual([
      { line: [ring[0], ring[1], ring[2]], color: '#f00' },
      { line: [ring[2], ring[3], ring[0]], color: '#00f' },
    ])
    expect(colourRuns(ring, ['#f00', '#f00', '#f00', '#f00'])).toHaveLength(1)
  })
})
