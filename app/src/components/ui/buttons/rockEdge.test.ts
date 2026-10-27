import { describe, expect, it } from 'vitest'
import { rockPolygon } from './rockEdge'

const points = (polygon: string) => polygon.slice('polygon('.length, -1).split(', ')

describe('rockPolygon', () => {
  it('is the same every time, and another for another seed', () => {
    expect(rockPolygon()).toBe(rockPolygon())
    expect(rockPolygon('a')).not.toBe(rockPolygon('b'))
  })

  it('has the points asked for along the long sides and 40% of them (at least two) along the short ones', () => {
    expect(points(rockPolygon('a', 10, 2))).toHaveLength(2 * 10 + 2 * 4)
    expect(points(rockPolygon('a', 3, 2))).toHaveLength(2 * 3 + 2 * 2)
    expect(points(rockPolygon('a', 99, 2))).toHaveLength(2 * 40 + 2 * 16) // 40 is the most
  })

  it('goes no further in than its intensity, and never outside the button', () => {
    for (const seed of ['a', 'b', 'stone']) {
      const polygon = rockPolygon(seed, 12, 3)
      for (const px of polygon.matchAll(/(\d+(?:\.\d+)?)px/g)) expect(Number(px[1])).toBeLessThanOrEqual(3)
      for (const percent of polygon.matchAll(/(?<![\d.])(\d+(?:\.\d+)?)%/g)) expect(Number(percent[1])).toBeLessThanOrEqual(100)
    }
  })

  it('is a straight border with no intensity: every point is on its edge', () => {
    const polygon = rockPolygon('a', 8, 0)
    expect(polygon).not.toMatch(/[1-9]\d*(?:\.\d+)?px/)
  })

  it('starts at the top left corner', () => {
    expect(points(rockPolygon('a'))[0]).toMatch(/^0% /)
  })
})
