import { describe, expect, it } from 'vitest'
import { collapsedRowCount, positions, RATIO, rowsFor, visibleCount } from './tileGrid'

describe('rowsFor', () => {
  it('puts the bigger rows (of 2) first', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rowsFor)).toEqual([
      [],
      [1],
      [2],
      [3],
      [2, 2],
      [2, 3],
      [3, 3],
      [2, 2, 3],
      [2, 3, 3],
      [3, 3, 3],
      [2, 2, 3, 3],
    ])
  })
})

describe('collapsed rows', () => {
  it('shows 3 rows of 3, or only 2 rows when one holds 2', () => {
    expect(collapsedRowCount([3, 3, 3, 3])).toBe(3)
    expect(collapsedRowCount([2, 3, 3])).toBe(2)
    expect(collapsedRowCount([2, 2, 3, 3])).toBe(2)
    expect(collapsedRowCount([1])).toBe(1)
    expect(visibleCount(12, false)).toBe(9)
    expect(visibleCount(8, false)).toBe(5)
    expect(visibleCount(10, false)).toBe(4)
    expect(visibleCount(10, true)).toBe(10)
    expect(visibleCount(5, false)).toBe(5)
  })
})

describe('positions', () => {
  const opts = { width: 196, gap: 6, railWidth: 36 }

  it('fills the width with 16:9 tiles, row by row', () => {
    const { tiles, height } = positions(5, 5, { ...opts, mode: 'grid' })
    const w2 = (196 - 6) / 2
    const w3 = (196 - 12) / 3
    expect(tiles[0]).toEqual({ left: 0, top: 0, width: w2, height: w2 * RATIO })
    expect(tiles[2].top).toBeCloseTo(w2 * RATIO + 6)
    expect(tiles[4].left).toBeCloseTo(2 * (w3 + 6))
    expect(height).toBeCloseTo(w2 * RATIO + 6 + w3 * RATIO)
  })

  it('keeps the same height in the rail, one equal 16:9 column', () => {
    for (const n of [1, 2, 4, 5, 9]) {
      const grid = positions(n, n, { ...opts, mode: 'grid' })
      const rail = positions(n, n, { ...opts, mode: 'rail' })
      expect(rail.height).toBe(grid.height)
      const last = rail.tiles.at(-1)!
      if (n > 1) expect(last.top + last.height).toBeCloseTo(grid.height)
      for (const t of rail.tiles) {
        expect(t.width).toBeLessThanOrEqual(36 + 1e-9)
        expect(t.height / t.width).toBeCloseTo(RATIO)
        expect(t.width).toBe(rail.tiles[0].width)
      }
    }
  })

  it('lays out only the shown tiles (collapsed)', () => {
    const { tiles } = positions(12, 9, { ...opts, mode: 'grid' })
    expect(tiles).toHaveLength(9)
  })
})
