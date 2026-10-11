import { describe, expect, it } from 'vitest'
import { collapsedRowCount, positions, RATIO, rowsFor, visibleCount } from './tileGrid'

describe('rowsFor', () => {
  it('puts at most 2 per row, an odd one full width on top', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(rowsFor)).toEqual([[], [1], [2], [1, 2], [2, 2], [1, 2, 2], [2, 2, 2], [1, 2, 2, 2]])
  })
})

describe('collapsed rows', () => {
  it('shows the first 3 rows', () => {
    expect(collapsedRowCount([2, 2, 2, 2])).toBe(3)
    expect(collapsedRowCount([1])).toBe(1)
    expect(visibleCount(5, false)).toBe(5)
    expect(visibleCount(7, false)).toBe(5)
    expect(visibleCount(8, false)).toBe(6)
    expect(visibleCount(8, true)).toBe(8)
  })
})

describe('positions', () => {
  const opts = { width: 196, gap: 6, railWidth: 36 }

  it('fills the width with 16:9 tiles, row by row', () => {
    const { tiles, height } = positions(3, 3, { ...opts, mode: 'grid' })
    const w2 = (196 - 6) / 2
    expect(tiles[0]).toEqual({ left: 0, top: 0, width: 196, height: 196 * RATIO })
    expect(tiles[1]).toEqual({ left: 0, top: 196 * RATIO + 6, width: w2, height: w2 * RATIO })
    expect(tiles[2].left).toBeCloseTo(w2 + 6)
    expect(height).toBeCloseTo(196 * RATIO + 6 + w2 * RATIO)
  })

  it('fills the same height in the rail with one column of equal tiles', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const grid = positions(n, n, { ...opts, mode: 'grid' })
      const rail = positions(n, n, { ...opts, mode: 'rail' })
      expect(rail.height).toBe(grid.height)
      const last = rail.tiles.at(-1)!
      expect(rail.tiles[0].top).toBe(0)
      expect(last.top + last.height).toBeCloseTo(grid.height)
      for (const t of rail.tiles) {
        expect(t.width).toBe(36)
        expect(t.height).toBeCloseTo(rail.tiles[0].height)
      }
    }
  })

  it('lays out only the shown tiles (collapsed)', () => {
    const { tiles } = positions(8, 6, { ...opts, mode: 'grid' })
    expect(tiles).toHaveLength(6)
  })
})
