// The little pixel-art animations on the Dashboard's big Create buttons (BigCreateButton.tsx), drawn in the button's own colours so they
// blend into its face: a pencil sketching a map (an island's coast, then a dashed route to an X) and a quill writing lines on a page.
// Each is a list of frames (its pixels as rectangles) on a SPRITE_W × SPRITE_H grid, the button's pixel size; the last frames hold the
// finished drawing before it starts again. Pure.

import type { StonePalette } from './stoneButton'

export const SPRITE_W = 34
export const SPRITE_H = 30

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

/** A sheet of paper: its face in the button's light rim colour, a darker edge along its right and bottom */
function sheet(x: number, y: number, w: number, h: number, p: StonePalette): Rect[] {
  return [
    [x, y, w, h, p.rim],
    [x + w, y + 1, 1, h, p.bevel],
    [x + 1, y + h, w, 1, p.bevel],
  ]
}

/** A pencil drawing a little map on a sheet: an island's coast, then a dashed route from it to an X */
export function mapFrames(p: StonePalette): Rect[][] {
  const paper = sheet(2, 9, 26, 18, p)
  // The coast: a lumpy loop round the island
  const coast = through([[7, 18], [8, 15], [11, 13], [14, 14], [16, 12], [19, 14], [19, 17], [17, 20], [13, 21], [10, 22], [8, 20], [7, 18]])
  // The route: every other pixel of a line from the coast to the X, a bend in it
  const route = through([[19, 15], [22, 14], [23, 12]]).filter((_, i) => i % 2 === 0)
  const x: Point[] = [[24, 11], [26, 13], [25, 12], [26, 11], [24, 13]]
  const stroke: Point[] = [...coast, ...route, ...x]
  const frames: Rect[][] = []
  // Two pixels a frame
  for (let n = 2; n <= stroke.length + 1; n += 2) {
    const drawn = stroke.slice(0, Math.min(n, stroke.length))
    frames.push([...paper, ...drawn.map((pt) => px(pt, p.ink)), ...pencil(drawn[drawn.length - 1], p)])
  }
  const done = [...paper, ...stroke.map((pt) => px(pt, p.ink))]
  for (let i = 0; i < HOLD; i++) frames.push(done)
  return frames
}

/** A quill writing lines on a page with a folded corner: each line a wavy scribble, left to right */
export function articleFrames(p: StonePalette): Rect[][] {
  const [x0, y0, w, h] = [5, 5, 19, 23]
  const page: Rect[] = [
    ...sheet(x0, y0, w, h, p),
    // the folded top right corner
    [x0 + w - 4, y0, 4, 4, p.face],
    [x0 + w - 4, y0, 1, 4, p.bevel],
    [x0 + w - 4, y0 + 3, 4, 1, p.bevel],
    [x0 + w - 3, y0 + 1, 2, 2, p.rim],
  ]
  // The lines: their lengths, a short last one; the writing waves a pixel up now and then, with gaps between words
  const lengths = [10, 14, 13, 14, 12, 7]
  const writing: Point[] = lengths.flatMap((length, row) => {
    const y = y0 + 6 + row * 3
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
