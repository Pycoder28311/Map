// Where the saved layouts' tiles go in the sidebar (pure: tested in tileGrid.test.ts).
// Tiles are 16:9 and fill the width, bigger rows first: rows of 2, then rows of 3. In the rail they
// stack in one column, in exactly the same total height, so nothing below them moves.

export const RATIO = 9 / 16

/**
 * How many tiles each row holds, top to bottom. 1 → one full-width tile; N%3 = 0 → rows of 3;
 * N%3 = 1 → two rows of 2, then rows of 3; N%3 = 2 → one row of 2, then rows of 3
 */
export function rowsFor(n: number): number[] {
  if (n <= 0) return []
  if (n === 1) return [1]
  const twos = [0, 2, 1][n % 3]
  return [...Array<number>(twos).fill(2), ...Array<number>((n - 2 * twos) / 3).fill(3)]
}

/** Rows shown before "Show more": 3 if the first 3 rows all hold 3, else only the first 2 */
export function collapsedRowCount(rows: number[]) {
  const first = rows.slice(0, 3)
  return Math.min(first.length === 3 && first.every((r) => r === 3) ? 3 : 2, rows.length)
}

/** How many tiles show: all of them, or those in the collapsed rows */
export function visibleCount(n: number, expanded: boolean) {
  const rows = rowsFor(n)
  return expanded ? n : rows.slice(0, collapsedRowCount(rows)).reduce((sum, r) => sum + r, 0)
}

export type TileBox = { left: number; top: number; width: number; height: number }

/**
 * The first `count` tiles' boxes (of n laid out in rowsFor(n)) and the area's height.
 * - grid: each row splits `width` evenly, `gap` apart
 * - rail: one column of equal 16:9 tiles centred in `railWidth`, spread over the same height
 */
export function positions(
  n: number,
  count: number,
  { width, gap, railWidth, mode }: { width: number; gap: number; railWidth: number; mode: 'grid' | 'rail' },
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

  // Rail: as tall as they can be in their share of the height, as wide as the rail allows
  const share = (height - (count - 1) * gap) / count
  const h = Math.min(share, railWidth * RATIO)
  const w = h / RATIO
  const spacing = count > 1 ? (height - count * h) / (count - 1) : 0
  const offset = count > 1 ? 0 : (height - h) / 2
  const tiles = Array.from({ length: count }, (_, i) => ({ left: (railWidth - w) / 2, top: offset + i * (h + spacing), width: w, height: h }))
  return { tiles, height }
}
