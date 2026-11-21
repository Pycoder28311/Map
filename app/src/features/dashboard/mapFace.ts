// The Create map button's face as a pixel-art map (BigCreateButton.tsx), filling the face inside its light rim: the sea on the left
// (deep and mid blue, a few wave marks) with a big island in it (shallows, a sandy beach, plain grass, a few snowy mountains), and plain
// green land on the right down to a sandy coast, with only a faint lighter speck now and then. While hovered, a pencil draws a dashed
// route across the island to an X (mapPencilFrames). On the button's pixel grid; the same every time. Pure.

import type { StonePalette } from './stoneButton'
import { pencil, through } from './createSprites'

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MAP_FACE = {
  grass: '#a8c872',
  grassLight: '#b4d17f',
  sand: '#d8c88e',
  shallow: '#8cc4cf',
  sea: '#5c9cbc',
  wave: '#86bfd6',
  mountain: '#6b6a5c',
  mountainShade: '#56554a',
  snow: '#e4e2d6',
  ink: '#2a1f22',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type Rect = [x: number, y: number, w: number, h: number, fill: string]
type Point = [x: number, y: number]

/** A pseudo-random number in [0, 1) from a pixel's place: the same every time, with no pattern to it */
const scatter = (i: number, j: number) => {
  const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453
  return v - Math.floor(v)
}

/** The map's layout on a face inside (x0, y0)–(x1, y1): where the coast is on each row, and the island's middle and size */
function layout(x0: number, y0: number, x1: number, y1: number) {
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  // The coast: how far across the sea reaches on each row (a wavering line a little past the middle)
  const coast = Array.from({ length: h }, (_, j) => Math.round(w * 0.52 + 3 * Math.sin(j / 4) + 2 * Math.sin(j / 1.7 + 1)))
  const cx = Math.round(w * 0.25)
  const cy = Math.round(h * 0.52)
  const rx = w * 0.17
  const ry = h * 0.36
  const island = (i: number, j: number) => {
    const a = Math.atan2(j - cy, i - cx)
    const r = 1 + 0.14 * Math.sin(3 * a + 0.7) + 0.09 * Math.sin(5 * a + 2)
    return Math.hypot((i - cx) / (rx * r), (j - cy) / (ry * r))
  }
  return { w, h, coast, cx, cy, island }
}

/** The map on the face inside (x0, y0)–(x1, y1); each row's runs of one colour are one rectangle */
export function mapFacePixels(x0: number, y0: number, x1: number, y1: number): Rect[] {
  const { w, h, coast, cx, cy, island } = layout(x0, y0, x1, y1)
  const grid: string[][] = []
  for (let j = 0; j < h; j++) {
    const row: string[] = []
    for (let i = 0; i < w; i++) {
      const fromCoast = i - coast[j]
      const d = island(i, j)
      let colour: string
      if (fromCoast > 2) colour = scatter(i, j) < 0.025 ? MAP_FACE.grassLight : MAP_FACE.grass
      else if (fromCoast >= 1) colour = MAP_FACE.sand
      else if (fromCoast > -3) colour = MAP_FACE.shallow
      else if (d < 0.78) colour = MAP_FACE.grass
      else if (d < 0.9) colour = MAP_FACE.sand
      else if (d < 1.12) colour = MAP_FACE.shallow
      else colour = MAP_FACE.sea
      row.push(colour)
    }
    grid.push(row)
  }
  // a few wave marks (‿) on the open sea
  const waves: Point[] = [[3, 3], [w * 0.42, 6], [5, h - 6], [w * 0.44, h - 4], [w * 0.36, h * 0.55]].map(([i, j]) => [Math.round(i), Math.round(j)])
  for (const [i, j] of waves) {
    if (island(i, j) < 1.25 || island(i + 2, j) < 1.25 || i + 3 >= coast[j] - 2) continue
    for (const [di, dj] of [[0, 0], [1, 1], [2, 0]]) if (grid[j + dj]?.[i + di] === MAP_FACE.sea) grid[j + dj][i + di] = MAP_FACE.wave
  }
  // mountains on the island: a little peak, snow at its top, shaded on its right
  for (const [mx, my] of [[cx - 4, cy - 1], [cx + 2, cy - 4], [cx + 3, cy + 3]]) {
    const peak: [number, number, string][] = [[0, -1, MAP_FACE.snow], [-1, 0, MAP_FACE.mountain], [0, 0, MAP_FACE.snow], [1, 0, MAP_FACE.mountainShade], [-2, 1, MAP_FACE.mountain], [-1, 1, MAP_FACE.mountain], [0, 1, MAP_FACE.mountain], [1, 1, MAP_FACE.mountainShade], [2, 1, MAP_FACE.mountainShade]]
    for (const [di, dj, c] of peak) if (grid[my + dj]?.[mx + di]) grid[my + dj][mx + di] = c
  }
  const rects: Rect[] = []
  grid.forEach((row, j) => {
    for (let i = 0; i < row.length; ) {
      let end = i
      while (end + 1 < row.length && row[end + 1] === row[i]) end++
      rects.push([x0 + i, y0 + j, end - i + 1, 1, row[i]])
      i = end + 1
    }
  })
  return rects
}

/** How many frames the finished route stays before it starts again */
const HOLD = 12

/** The pencil's frames while the button is hovered: it draws a dashed route across the island, between the mountains, to an X */
export function mapPencilFrames(x0: number, y0: number, x1: number, y1: number, p: StonePalette): Rect[][] {
  const { cx, cy } = layout(x0, y0, x1, y1)
  const at = ([i, j]: Point): Point => [x0 + i, y0 + j]
  const corners: Point[] = [[cx - 8, cy + 4], [cx - 4, cy + 3], [cx - 1, cy], [cx + 1, cy - 1], [cx + 6, cy]]
  const route = through(corners.map(at)).filter((_, k) => k % 2 === 0)
  const x: Point[] = ([[cx + 7, cy - 2], [cx + 9, cy], [cx + 8, cy - 1], [cx + 9, cy - 2], [cx + 7, cy]] as Point[]).map(at)
  const stroke = [...route, ...x]
  const dot = ([i, j]: Point): Rect => [i, j, 1, 1, MAP_FACE.ink]
  const frames: Rect[][] = []
  for (let n = 1; n <= stroke.length; n++) {
    const drawn = stroke.slice(0, n)
    frames.push([...drawn.map(dot), ...pencil(drawn[drawn.length - 1], p)])
  }
  const done = stroke.map(dot)
  for (let k = 0; k < HOLD; k++) frames.push(done)
  return frames
}
