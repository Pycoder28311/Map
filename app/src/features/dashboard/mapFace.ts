// The Create map button's face as a pixel-art map (BigCreateButton.tsx), filling the face inside its light rim: plain green land (only a
// faint lighter speck now and then) with a bay of sea on its left, land all round it (a beach, shallows, a few wave marks), and a small
// island in the bay's middle (shallows, a beach, grass, two snowy mountains), open water all round it. While hovered, a pencil draws a dashed
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

/** The map's layout on a face inside (x0, y0)–(x1, y1): the sea, a bay with land all round it, and the island in its middle */
function layout(x0: number, y0: number, x1: number, y1: number) {
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  // The sea: an uneven oval on the left, land all round it (so the button's rim always lies on land), well short of the words
  const sx = w * 0.2
  const sy = h * 0.5
  const sea = (i: number, j: number) => {
    const a = Math.atan2(j - sy, i - sx)
    const r = 1 + 0.08 * Math.sin(3 * a + 1.1) + 0.05 * Math.sin(5 * a + 0.3)
    return Math.hypot((i - sx) / (w * 0.165 * r), (j - sy) / (h * 0.4 * r))
  }
  // The island: small, in the sea's middle, a ring of open water all round it
  const cx = Math.round(sx)
  const cy = Math.round(sy)
  const island = (i: number, j: number) => {
    const a = Math.atan2(j - cy, i - cx)
    const r = 1 + 0.14 * Math.sin(3 * a + 0.7) + 0.09 * Math.sin(5 * a + 2)
    return Math.hypot((i - cx) / (w * 0.075 * r), (j - cy) / (h * 0.22 * r))
  }
  return { w, h, sea, cx, cy, island }
}

/** The map on the face inside (x0, y0)–(x1, y1); each row's runs of one colour are one rectangle */
export function mapFacePixels(x0: number, y0: number, x1: number, y1: number): Rect[] {
  const { w, h, sea, cx, cy, island } = layout(x0, y0, x1, y1)
  const grid: string[][] = []
  for (let j = 0; j < h; j++) {
    const row: string[] = []
    for (let i = 0; i < w; i++) {
      const s = sea(i, j)
      const d = island(i, j)
      let colour: string
      if (s > 1.12) colour = scatter(i, j) < 0.025 ? MAP_FACE.grassLight : MAP_FACE.grass
      else if (s > 1) colour = MAP_FACE.sand
      else if (s > 0.86) colour = MAP_FACE.shallow
      else if (d < 0.75) colour = MAP_FACE.grass
      else if (d < 1) colour = MAP_FACE.sand
      else if (d < 1.3) colour = MAP_FACE.shallow
      else colour = MAP_FACE.sea
      row.push(colour)
    }
    grid.push(row)
  }
  // a few wave marks (‿) on the open sea, where there is room for them
  for (const [i, j] of [[cx - 7, cy - 9], [cx + 3, cy - 10], [cx - 8, cy + 8], [cx + 4, cy + 9]] as Point[]) {
    const fits = [0, 1, 2].every((di) => grid[j]?.[i + di] === MAP_FACE.sea && grid[j + 1]?.[i + di] === MAP_FACE.sea)
    if (fits) for (const [di, dj] of [[0, 0], [1, 1], [2, 0]]) grid[j + dj][i + di] = MAP_FACE.wave
  }
  // mountains on the island: a little peak, snow at its top, shaded on its right
  for (const [mx, my] of [[cx - 1, cy - 2], [cx + 1, cy + 3]]) {
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

/** The pencil's frames while the button is hovered: it draws a dashed route up the island, past its mountains, to an X */
export function mapPencilFrames(x0: number, y0: number, x1: number, y1: number, p: StonePalette): Rect[][] {
  const { cx, cy } = layout(x0, y0, x1, y1)
  const at = ([i, j]: Point): Point => [x0 + i, y0 + j]
  const corners: Point[] = [[cx - 3, cy + 5], [cx - 2, cy + 2], [cx + 1, cy], [cx + 1, cy - 2]]
  const route = through(corners.map(at)).filter((_, k) => k % 2 === 0)
  const x: Point[] = ([[cx - 2, cy - 6], [cx, cy - 4], [cx - 1, cy - 5], [cx, cy - 6], [cx - 2, cy - 4]] as Point[]).map(at)
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
