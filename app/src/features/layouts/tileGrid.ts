// Where the saved layouts' tiles go in the sidebar (pure: tested in tileGrid.test.ts).
// Tiles are 16:9 and fill the width, at most 2 per row, bigger rows first. In the rail they stack in
// one column of squares as big as the rail's rows (railWidth), centred in it.

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
 * - rail: one column of squares, `railWidth` wide and tall, `railGap` apart (the area's height is theirs, not the grid's)
 */
export function positions(
  n: number,
  count: number,
  { width, gap, railWidth, railGap = gap, mode }: { width: number; gap: number; railWidth: number; railGap?: number; mode: 'grid' | 'rail' },
): { tiles: TileBox[]; height: number } {
  const grid: TileBox[] = []
  let top = 0
  for (const perRow of rowsFor(n)) {
    if (grid.length >= count) break
    const w = (width - (perRow - 1) * gap) / perRow
    const h = w * RATIO
    for (let i = 0; i < perRow && grid.length < count; i++) grid.push({ left: i * (w + gap), top, width: w, height: h })
    top += h + gap
  }
  const height = grid.length ? top - gap : 0
  if (mode === 'grid' || count === 0) return { tiles: grid, height }

  // Rail: squares as wide as the rail's rows, one under the other
  const tiles = Array.from({ length: count }, (_, i) => ({ left: 0, top: i * (railWidth + railGap), width: railWidth, height: railWidth }))
  return { tiles, height: count * railWidth + (count - 1) * railGap }
}
