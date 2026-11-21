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
export const ARTICLE_PAPER = [2, 6, 34, 23] as const

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
export const through = (corners: Point[]): Point[] => corners.slice(1).flatMap((c, i) => line(corners[i], c).slice(i === 0 ? 0 : 1))

const px = ([x, y]: Point, fill: string): Rect => [x, y, 1, 1, fill]

/** A pencil whose tip is at `tip`, lying up and to the right of it: a dark point, a light wooden cone, a two-pixel body, a light end */
export function pencil([x, y]: Point, p: StonePalette): Rect[] {
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

/**
 * A sheet of old paper on the button: its face in the button's light rim colour, lightly speckled inside a plain edge (no fade); the same
 * speckles every time (`seed`)
 */
function sheet(x: number, y: number, w: number, h: number, p: StonePalette, seed = 1): Rect[] {
  let n = seed * 7919
  const next = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
  const rects: Rect[] = []
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ring = Math.min(i, j, w - 1 - i, h - 1 - j)
      const roll = next()
      rects.push([x + i, y + j, 1, 1, ring > 0 && roll < 0.07 ? p.face : p.rim])
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
    ...sheet(sx, sy, sw, sh, p, 3),
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

/**
 * A quill writing in an open book, in its own pastel colours (BOOK_ART): two off-white pages spread from a sunken spine (their outer
 * corners curving up a little), the brown cover showing round them and the pages' edges stacked under them; the quill writes the left page's lines, then the right page's
 */
/** The open book's own colours: soft pastel pages, cover and ink, cream and warm brown to sit on the button's gold */
export const BOOK_ART = {
  page: '#f3e8cc',
  speck: '#e8d9b4',
  spine: '#d2b47e',
  edge: '#e6d4aa',
  edgeShade: '#ba9862',
  cover: '#8e6a3e',
  ink: '#5a401f',
} as const

export function articleFrames(p: StonePalette): Rect[][] {
  const [x0, y0, W, H] = ARTICLE_PAPER
  const PAGE = 16
  const SPINE = x0 + PAGE
  const book: Rect[] = []
  // the cover, a pixel round the pages and under them
  book.push([x0 - 1, y0 + 2, W + 2, H, BOOK_ART.cover])
  // the pages' edges, stacked under the spread
  book.push([x0, y0 + H - 1, W, 2, BOOK_ART.edge], [x0, y0 + H, W, 1, BOOK_ART.edgeShade])
  let n = 101
  const next = () => (n = (n * 1103515245 + 12345) % 2147483648) / 2147483648
  // the two pages: each column's top curves down toward the spine
  for (let i = 0; i < W; i++) {
    const onLeft = i < PAGE
    const fromSpine = onLeft ? PAGE - 1 - i : i - PAGE - 2
    if (!onLeft && fromSpine < 0) continue
    const top = y0 + (fromSpine < 3 ? 2 : fromSpine < 8 ? 1 : 0)
    for (let y = top; y < y0 + H - 1; y++) book.push([x0 + i, y, 1, 1, fromSpine === 0 ? BOOK_ART.speck : next() < 0.06 ? BOOK_ART.speck : BOOK_ART.page])
  }
  // the spine, sunken in shade
  book.push([SPINE, y0 + 2, 2, H - 3, BOOK_ART.spine])
  // The lines: on the left page, then the right; the writing waves a pixel up now and then, with gaps between words
  const lines = (from: number, lengths: number[]): Point[] =>
    lengths.flatMap((length, row) => {
      const y = y0 + 5 + row * 3
      const points: Point[] = []
      for (let i = 0; i < length; i++) {
        if ((i + row * 2) % 5 === 4) continue
        points.push([from + i, y - ((i + row) % 3 === 0 ? 1 : 0)])
      }
      return points
    })
  const writing = [...lines(x0 + 2, [11, 12, 10, 12, 11, 6]), ...lines(SPINE + 3, [11, 11, 12, 10, 12, 5])]
  const frames: Rect[][] = []
  for (let k = 2; k <= writing.length + 1; k += 2) {
    const drawn = writing.slice(0, Math.min(k, writing.length))
    frames.push([...book, ...drawn.map((pt) => px(pt, BOOK_ART.ink)), ...quill(drawn[drawn.length - 1], p)])
  }
  const done = [...book, ...writing.map((pt) => px(pt, BOOK_ART.ink))]
  for (let i = 0; i < HOLD; i++) frames.push(done)
  return frames
}
