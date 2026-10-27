import { describe, expect, it } from 'vitest'
import { CRACK_DEPTH, CRACK_GAP, crackedPolygons } from './crack'

const points = (polygon: string) => polygon.slice('polygon('.length, -1).split(', ')
/** The px of each crack point (the picture's: up from its bottom edge; the text's: down from its top edge) */
const pxOf = (point: string) => Number(/(\d+(?:\.\d+)?)px/.exec(point)![1])
const xOf = (point: string) => Number(/^(\d+(?:\.\d+)?)%/.exec(point)![1])

describe('crackedPolygons', () => {
  it('is the same for the same seed, and not for another', () => {
    expect(crackedPolygons('articles:5')).toEqual(crackedPolygons('articles:5'))
    expect(crackedPolygons('articles:5')).not.toEqual(crackedPolygons('articles:6'))
  })

  it('is cracked only along the edge the parts touch: the other sides are straight', () => {
    const { top, bottom } = crackedPolygons('a')
    expect(points(top).slice(0, 2)).toEqual(['0 0', '100% 0'])
    expect(points(bottom).slice(-2)).toEqual(['100% 100%', '0 100%'])
  })

  it('gives both parts the same line, CRACK_GAP apart all along it', () => {
    for (const seed of ['a', 'b', 'articles:12', '']) {
      const { top, bottom } = crackedPolygons(seed)
      const picture = points(top).slice(2).reverse() // left to right
      const text = points(bottom).slice(0, -2)
      expect(picture).toHaveLength(text.length)
      picture.forEach((point, k) => {
        expect(xOf(point)).toBe(xOf(text[k]))
        // The crack on the picture box is `up` from its bottom (which is `depth` past the middle line) and on the text box `down` from its
        // top (`depth` before it): together they are 2 × depth plus the gap, whatever the wander is
        expect(pxOf(point) + pxOf(text[k])).toBeCloseTo(2 * CRACK_DEPTH + CRACK_GAP, 0)
      })
    }
  })

  it('runs left to right across the whole width, in order', () => {
    const xs = points(crackedPolygons('a').bottom).slice(0, -2).map(xOf)
    expect(xs[0]).toBe(0)
    expect(xs.at(-1)).toBe(100)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  })

  it('stays inside its boxes', () => {
    const { top, bottom } = crackedPolygons('a')
    for (const point of [...points(top).slice(2), ...points(bottom).slice(0, -2)]) {
      expect(pxOf(point)).toBeGreaterThan(0)
      expect(pxOf(point)).toBeLessThan(2 * CRACK_DEPTH + CRACK_GAP)
    }
  })
})
