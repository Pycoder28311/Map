// The little pixel-art animations on the Dashboard's big Create buttons (BigCreateButton.tsx), drawn in the button's own colours so they
// blend into its face: a pencil sketching a map on an old sheet (an island's coast, shaded, then a dashed route to an X) and a quill
// writing lines on a page.
// Each is a list of frames (its pixels as rectangles) on a SPRITE_W × SPRITE_H grid, the button's pixel size; the last frames hold the
// finished drawing before it starts again. Pure.

import type { StonePalette } from './stoneButton'

export const SPRITE_W = 40
export const SPRITE_H = 38
/** Where each sheet of paper is on its animation's grid (x, y, width, height): the button places it by its paper */
export const MAP_PAPER = [1, 4, 33, 28] as const
export const ARTICLE_PAPER = [3, 5, 27, 31] as const

type Rect = [x: number, y: number, w: number, h: number, fill: string]
type Point = [x: number, y: number]

/** How many frames the finished drawing stays before it starts again */
const HOLD = 14

/** The pixels of a straight line from a to b (both ends in) */
function line([x0, y0]: Point, [x1, y1]: Point): Point[] {
  const points: Point[] = []
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (let x = x0, y = y0; ; ) {
    points.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return points
}

/** A path through these corners, pixel by pixel, without repeating a corner */
const through = (corners: Point[]): Point[] => corners.slice(1).flatMap((c, i) => line(corners[i], c).slice(i === 0 ? 0 : 1))

const px = ([x, y]: Point, fill: string): Rect => [x, y, 1, 1, fill]

/** A pencil whose tip is at `tip`, lying up and to the right of it: a dark point, a light wooden cone, a two-pixel body, a light end */
function pencil([x, y]: Point, p: StonePalette): Rect[] {
  const rects: Rect[] = [px([x, y], p.ink), px([x + 1, y - 1], p.rim), px([x + 1, y], p.rim), px([x, y - 1], p.rim)]
  for (let k = 2; k <= 7; k++) rects.push(px([x + k, y - k], p.bevelDark), px([x + k + 1, y - k], p.depth), px([x + k, y - k - 1], p.bevel))
  rects.push(px([x + 8, y - 8], p.rim), px([x + 9, y - 8], p.rim), px([x + 8, y - 9], p.rim))
  return rects
}

/** A quill whose nib is at `tip`: a dark nib and shaft going up and to the right, a feather along it */
function quill([x, y]: Point, p: StonePalette): Rect[] {
  const rects: Rect[] = [px([x, y], p.ink)]
  for (let k = 1; k <= 10; k++) rects.push(px([x + k, y - k], p.bevelDark))
  for (let k = 4; k <= 10; k++) {
    const width = k < 6 ? 1 : k < 9 ? 2 : 1
    for (let w = 1; w <= width; w++) rects.push(px([x + k + w, y - k], p.bevel), px([x + k, y - k - w], p.rim))
  }
  return rects
}

/** A 4 × 4 ordered dither: which pixels of a ring show, so a fade reads as an even gradient rather than noise */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

/**
 * A sheet of old paper that blends into the button: its face in the button's light rim colour, lightly speckled, its edges fading into
 * the button's face over `fade` rings of pixels (an ordered dither, each ring further in a little fuller), so it has no border; the same
 * speckles every time (`seed`)
 */
function sheet(x: number, y: number, w: number, h: number, p: StonePalette, seed = 1, fade = 2): Rect[] {
  let n = seed * 7919
  const next = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
  const rects: Rect[] = []
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ring = Math.min(i, j, w - 1 - i, h - 1 - j)
      const roll = next()
      if (ring < fade && BAYER[j % 4][i % 4] >= ((ring + 1) / (fade + 1)) * 16) continue
      rects.push([x + i, y + j, 1, 1, ring >= fade && roll < 0.07 ? p.face : p.rim])
    }
  }
  return rects
}

/** Whether (x, y) is inside the polygon through these corners */
function inside([x, y]: Point, corners: Point[]): boolean {
  let hit = false
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const [xi, yi] = corners[i]
    const [xj, yj] = corners[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

/**
 * A pencil drawing a little map on an old sheet (speckled, a fold down its middle, ripples on its sea): first an island's coast; then the
 * island is shaded in, with two little mountains on it; then a dashed route from it to an X
 */
export function mapFrames(p: StonePalette): Rect[][] {
  const [sx, sy, sw, sh] = MAP_PAPER
  const paper: Rect[] = [
    ...sheet(sx, sy, sw, sh, p, 3, 5),
    // the fold
    [sx + 16, sy + 1, 1, sh - 2, p.face],
    // ripples on the sea
    ...([[4, 9], [26, 27], [5, 27], [27, 21], [10, 8]] as Point[]).flatMap(([x, y]): Rect[] => [
      [x, y, 2, 1, p.bevel],
      [x + 2, y - 1, 1, 1, p.bevel],
    ]),
  ]
  const corners: Point[] = [[7, 20], [8, 15], [12, 12], [16, 13], [19, 10], [24, 12], [25, 17], [22, 22], [17, 24], [12, 26], [8, 24], [7, 20]]
  const coast = through(corners)
  // The land: every pixel inside the coast, shaded, with a light speckle; two little mountains on it
  const land: Rect[] = []
  for (let y = 10; y <= 26; y++) for (let x = 7; x <= 25; x++) if (inside([x + 0.5, y + 0.5], corners)) land.push(px([x, y], (x * 7 + y * 3) % 11 === 0 ? p.rim : p.bevel))
  const mountains: Rect[] = ([[12, 19], [17, 17]] as Point[]).flatMap(([x, y]): Rect[] => [px([x, y], p.ink), px([x - 1, y + 1], p.ink), px([x + 1, y + 1], p.ink), px([x - 2, y + 2], p.ink), px([x + 2, y + 2], p.ink)])
  const route = through([[25, 15], [28, 14], [29, 12], [30, 11]]).filter((_, i) => i % 2 === 0)
  const x: Point[] = [[29, 8], [31, 10], [30, 9], [31, 8], [29, 10]]
  const frames: Rect[][] = []
  const draw = (fixed: Rect[], stroke: Point[]) => {
    for (let n = 2; n <= stroke.length + 1; n += 2) {
      const drawn = stroke.slice(0, Math.min(n, stroke.length))
      frames.push([...fixed, ...drawn.map((pt) => px(pt, p.ink)), ...pencil(drawn[drawn.length - 1], p)])
    }
  }
  draw(paper, coast)
  const island = [...paper, ...land, ...coast.map((pt) => px(pt, p.ink)), ...mountains]
  frames.push([...island, ...pencil([17, 17], p)], [...island, ...pencil([17, 17], p)])
  draw(island, [...route, ...x])
  const done = [...island, ...[...route, ...x].map((pt) => px(pt, p.ink))]
  for (let i = 0; i < HOLD; i++) frames.push(done)
  return frames
}

/** A quill writing lines on a page with a folded corner: each line a wavy scribble, left to right */
export function articleFrames(p: StonePalette): Rect[][] {
  const [x0, y0, w, h] = ARTICLE_PAPER
  const page: Rect[] = [
    ...sheet(x0, y0, w, h, p, 5),
    // the folded top right corner
    [x0 + w - 5, y0, 5, 5, p.face],
    [x0 + w - 5, y0, 1, 5, p.bevel],
    [x0 + w - 5, y0 + 4, 5, 1, p.bevel],
    [x0 + w - 4, y0 + 1, 3, 3, p.rim],
  ]
  // The lines: their lengths, a short last one; the writing waves a pixel up now and then, with gaps between words
  const lengths = [14, 21, 20, 21, 19, 21, 18, 10]
  const writing: Point[] = lengths.flatMap((length, row) => {
    const y = y0 + 7 + row * 3
    const points: Point[] = []
    for (let i = 0; i < length; i++) {
      if ((i + row * 2) % 6 === 5) continue
      points.push([x0 + 3 + i, y - ((i + row) % 3 === 0 ? 1 : 0)])
    }
    return points
  })
  const frames: Rect[][] = []
  for (let n = 2; n <= writing.length + 1; n += 2) {
    const drawn = writing.slice(0, Math.min(n, writing.length))
    frames.push([...page, ...drawn.map((pt) => px(pt, p.ink)), ...quill(drawn[drawn.length - 1], p)])
  }
  const done = [...page, ...writing.map((pt) => px(pt, p.ink))]
  for (let i = 0; i < HOLD; i++) frames.push(done)
  return frames
}
