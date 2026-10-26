// Where the saved layouts' tiles go in the sidebar (pure: tested in tileGrid.test.ts).
// Tiles are 16:9 and fill the width, at most 2 per row, bigger rows first. In the rail they stack in
// one column as wide as the rail's rows (railWidth), each grid row keeping its height: a row of one tile is one tall tile,
// a row of two is two tiles stacked, so nothing below them moves.

export const RATIO = 9 / 16

/**
 * How many tiles each row holds, top to bottom: rows of 2; an odd count starts with one full-width
 * tile (1 = 1, 3 = 1+2, 5 = 1+2+2)
 */
export function rowsFor(n: number): number[] {
  if (n <= 0) return []
  const pairs = Array<number>(Math.floor(n / 2)).fill(2)
  return n % 2 ? [1, ...pairs] : pairs
}

/** Rows shown before "Show more": the first 3 */
export const collapsedRowCount = (rows: number[]) => Math.min(3, rows.length)

/** How many tiles show: all of them, or those in the collapsed rows */
export function visibleCount(n: number, expanded: boolean) {
  const rows = rowsFor(n)
  return expanded ? n : rows.slice(0, collapsedRowCount(rows)).reduce((sum, r) => sum + r, 0)
}

export type TileBox = { left: number; top: number; width: number; height: number }

/**
 * The first `count` tiles' boxes (of n laid out in rowsFor(n)) and the area's height.
 * - grid: each row splits `width` evenly, `gap` apart
 * - `bottomExtra`: the last row is this much taller than 16:9 (px), so the tiles reach a little further down
 * - rail: one column, `railWidth` wide; each grid row keeps its height and top: a row of one is one tile of that height,
 *   a row of two is its two tiles one above the other (`railGap` apart), so the area's height is the grid's
 */
export function positions(
  n: number,
  count: number,
  { width, gap, railWidth, railGap = gap, bottomExtra = 0, mode }: { width: number; gap: number; railWidth: number; railGap?: number; bottomExtra?: number; mode: 'grid' | 'rail' },
): { tiles: TileBox[]; height: number } {
  const tiles: TileBox[] = []
  let top = 0
  for (const perRow of rowsFor(n)) {
    if (tiles.length >= count) break
    const w = (width - (perRow - 1) * gap) / perRow
    // The row that holds the last shown tile is a little taller
    const last = tiles.length + perRow >= count
    const h = w * RATIO + (last ? bottomExtra : 0)
    const inRow = Math.min(perRow, count - tiles.length)
    // Rail: the row's tiles one above the other, together as tall as the row
    const stacked = (h - (perRow - 1) * railGap) / perRow
    for (let i = 0; i < inRow; i++) {
      tiles.push(
        mode === 'grid'
          ? { left: i * (w + gap), top, width: w, height: h }
          : { left: 0, top: top + i * (stacked + railGap), width: railWidth, height: perRow === 1 ? h : stacked },
      )
    }
    top += h + gap
  }
  return { tiles, height: tiles.length ? top - gap : 0 }
}
