import { describe, expect, it } from 'vitest'
import { PENCIL_STYLE } from './style'
import { lineFromStroke } from './paths'

const pts = (...xy: [number, number][]) => xy.map(([x, y]) => ({ x, y }))

describe('lineFromStroke', () => {
  it('simplifies and keeps the ends', () => {
    const line = lineFromStroke(pts([0, 0], [5, 0], [10, 0], [20, 0]), PENCIL_STYLE)
    expect(line.kind).toBe('line')
    expect(line.points).toEqual(pts([0, 0], [20, 0]))
    expect(line.style).toBe(PENCIL_STYLE)
  })

  it('leaves one point as a dot', () => {
    expect(lineFromStroke(pts([4.4, 7.6]), PENCIL_STYLE).points).toEqual(pts([4, 8]))
  })
})
