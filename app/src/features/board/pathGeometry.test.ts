import { describe, expect, it } from 'vitest'
import { flattenedOf, lengthOf, softened, trimEnds } from './pathGeometry'
import { line, pts, shape } from './testing'

describe('flattenedOf', () => {
  it('is the same array for the same object', () => {
    const l = line(1, pts([0, 0], [10, 0]))
    expect(flattenedOf(l)).toBe(flattenedOf(l))
  })

  it('works out a shape from its box', () => {
    expect(flattenedOf(shape(1)).length).toBe(4)
  })

  it('samples a handled line', () => {
    const l = line(1, pts([0, 0], [100, 0]), { handles: [{ inX: 0, inY: 0, outX: 0, outY: 40 }, { inX: 0, inY: 40, outX: 0, outY: 0 }] })
    expect(flattenedOf(l).length).toBeGreaterThan(4)
  })
})

describe('softened', () => {
  const corner = pts([0, 0], [100, 0], [100, 100])

  it('is the input at 0', () => {
    expect(softened(corner, 0)).toBe(corner)
  })

  it('keeps the ends and rounds the corner', () => {
    const out = softened(corner, 100)
    expect(out[0]).toEqual({ x: 0, y: 0 })
    expect(out.at(-1)).toEqual({ x: 100, y: 100 })
    expect(out.length).toBeGreaterThan(3)
    expect(out.some((p) => p.x === 100 && p.y === 0)).toBe(false)
  })

  it('leaves two points alone', () => {
    const two = pts([0, 0], [5, 5])
    expect(softened(two, 100)).toBe(two)
  })
})

describe('lengthOf', () => {
  it('adds the segments', () => expect(lengthOf(pts([0, 0], [3, 4], [3, 14]))).toBe(15))
})

describe('trimEnds', () => {
  it('shortens both ends along the line', () => {
    expect(trimEnds(pts([0, 0], [10, 0], [10, 10]), 4, 3)).toEqual(pts([4, 0], [10, 0], [10, 7]))
  })

  it('leaves a line too short to trim alone', () => {
    const short = pts([0, 0], [5, 0])
    expect(trimEnds(short, 4, 4)).toBe(short)
  })
})
