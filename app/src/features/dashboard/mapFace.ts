// The Create map button's face as a pixel-art map (BigCreateButton.tsx), filling the face inside its light rim: the sea over all its left
// part (from the left edge, full height; a few wave marks), blending through shallows and a beach into plain green land on the right
// (only a faint lighter speck now and then), and a small island in the sea's middle (shallows, a beach, grass, two snowy mountains), open water all round it. While hovered, a pencil draws a dashed
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
  // The sea: all of the left part, from the face's left edge and its full height, to a wavering shore short of the words; 1 on the shore
  // line (below 1 the sea, above it the beach and the land: 0.03 a pixel, so the colours blend over a few pixels either side)
  const sx = 20.5
  const sy = (h - 1) / 2
  const shore = (j: number) => 37 + 1.6 * Math.sin(j / 3.2 + 0.4) + 0.9 * Math.sin(j / 1.6 + 2)
  const sea = (i: number, _j: number) => 1 + (i - shore(_j)) * 0.03
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

/** The colour at `t` along the shore: deep sea up to 0.7, then smoothly through the shallows (0.9) and the beach (1.03) to the grass
 *  (1.12), in steps of a few colours so it stays pixel art */
const STOPS: [number, string][] = [[0.7, MAP_FACE.sea], [0.9, MAP_FACE.shallow], [1.0, MAP_FACE.sand], [1.06, MAP_FACE.sand], [1.12, MAP_FACE.grass]]
function ramp(t: number): string {
  if (t <= STOPS[0][0]) return STOPS[0][1]
  for (let k = 1; k < STOPS.length; k++) {
    const [t1, c1] = STOPS[k]
    const [t0, c0] = STOPS[k - 1]
    if (t <= t1) return mix(c0, c1, Math.round(((t - t0) / (t1 - t0)) * 4) / 4)
  }
  return STOPS[STOPS.length - 1][1]
}

/** A colour between two hex colours (`t` 0: the first, 1: the second) */
function mix(a: string, b: string, t: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('')}`
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
      // The colours blend smoothly from the deep sea through the shallows and the beach to the grass (in a few pixel steps), on the
      // shore and round the island alike
      const shore = s > 1.12 ? null : ramp(s)
      // (the island: grass up to 0.75 of its size, open sea from 1.3)
      const isle = ramp(1.693 - d * 0.764)
      let colour: string
      if (!shore) colour = scatter(i, j) < 0.025 ? MAP_FACE.grassLight : MAP_FACE.grass
      else colour = d < 1.3 ? isle : shore
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
