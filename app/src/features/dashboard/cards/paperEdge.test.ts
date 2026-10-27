import { describe, expect, it } from 'vitest'
import { paperEdgePolygon } from './paperEdge'

const points = (polygon: string) => polygon.slice('polygon('.length, -1).split(', ')
const number = (text: string) => Number(/(\d+(?:\.\d+)?)/.exec(text)![1])

describe('paperEdgePolygon', () => {
  it('is the same for the same seed, and not for another', () => {
    expect(paperEdgePolygon('maps:5')).toBe(paperEdgePolygon('maps:5'))
    expect(paperEdgePolygon('maps:5')).not.toBe(paperEdgePolygon('maps:6'))
  })

  it('has more points the more cuts it has, and none are cut with none', () => {
    const none = points(paperEdgePolygon('a', 0, 6)).length
    const some = points(paperEdgePolygon('a', 4, 6)).length
    expect(some).toBeGreaterThan(none)
    expect(some - none).toBeLessThanOrEqual(4 * 4 * 3) // three points a cut, at most
  })

  it('never goes further in than its depth, nor out of the box', () => {
    for (const seed of ['a', 'b', 'maps:12', '']) {
      const polygon = paperEdgePolygon(seed, 3, 6)
      for (const px of polygon.matchAll(/(\d+(?:\.\d+)?)px/g)) expect(Number(px[1])).toBeLessThanOrEqual(6)
      for (const percent of polygon.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)%/g)) expect(Number(percent[1])).toBeLessThanOrEqual(100)
    }
  })

  it('walks each side in order, so the edge never doubles back', () => {
    const list = points(paperEdgePolygon('maps:7', 3, 6))
    // The top side first: x grows from 0, y is the px in; it ends where the right side starts (x is calc(100% - …))
    const top = list.slice(0, list.findIndex((p) => p.startsWith('calc(')))
    const xs = top.map(number)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
    expect(top[0]).toMatch(/^0% /)
  })

  it('has cuts as deep as asked and no deeper', () => {
    const deep = Math.max(...[...paperEdgePolygon('maps:3', 3, 6).matchAll(/(\d+(?:\.\d+)?)px/g)].map((m) => Number(m[1])))
    expect(deep).toBeGreaterThan(2)
    expect(deep).toBeLessThanOrEqual(6)
  })
})
