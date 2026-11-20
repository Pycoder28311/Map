// The Dashboard's big Create button in pixel art (BigCreateButton.tsx): a pale stone slab, like an old game's menu button. Its face has a
// light rim along its top and left, a darker edge down its right and two bevel rows along its bottom; under it the slab's dark thickness,
// and a soft shadow under that, a little to the right; every corner stepped. In two parts, so the face can sink when pressed: FACE (the
// face and its bevels) and BASE (the thickness and the shadow). STONE_W × STONE_H pixels of STONE_PIXEL px each: the size of the
// Dashboard's other pixel art (cards/book.ts).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const STONE = {
  /** The light rim along the top and left */
  rim: '#bdb6a2',
  face: '#a89f8d',
  /** The edge down the right and the first bevel row, and the darker second one */
  bevel: '#8a7b70',
  bevelDark: '#685552',
  /** The slab's thickness, and its lowest row */
  depth: '#453636',
  depthLow: '#36282c',
  shadow: 'rgb(12 8 10 / 0.55)',
  /** The word on it */
  ink: '#2a1f22',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const STONE_PIXEL = 3
/** The slab's width in pixels; the drawing is two more (the shadow sits two to the right). About 3.4 times its face's height, as in the reference */
const W = 110
export const STONE_W = W + 2
/** The face's rows (its word is centred on them), then its two bevel rows, the slab's three rows of thickness, the shadow's two */
export const STONE_FACE_ROWS = 32
const BEVEL = STONE_FACE_ROWS
const DEPTH = BEVEL + 2
const SHADOW = DEPTH + 3
export const STONE_H = SHADOW + 2
/** How thick the light rim along the top and left is */
const RIM = 3
/** How far (pixels) the face sinks while pressed */
export const STONE_PRESS = 2

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** How far in each row starts (and ends), for the rounded corners: four steps at the top, more at the bottom of the thickness and shadow */
const INDENT: Record<number, number> = { 0: 4, 1: 2, 2: 1, 3: 1, [DEPTH]: 1, [DEPTH + 1]: 1, [DEPTH + 2]: 2, [SHADOW]: 3, [SHADOW + 1]: 5 }
const indent = (y: number) => INDENT[y] ?? 0

/** A row's pixels, `colourAt` each (runs of one colour are one rectangle) */
function row(y: number, from: number, to: number, colourAt: (x: number) => string): Rect[] {
  const rects: Rect[] = []
  for (let x = from; x <= to; x++) {
    const colour = colourAt(x)
    const last = rects[rects.length - 1]
    if (last && last[4] === colour && last[0] + last[2] === x) last[2]++
    else rects.push([x, y, 1, 1, colour])
  }
  return rects
}

/** The face: its rim (along the top and left), its right edge (a bevel column, then a dark one), and its two bottom bevel rows */
export const STONE_FACE: Rect[] = Array.from({ length: DEPTH }, (_, y) => {
  const from = indent(y)
  const to = W - 1 - indent(y)
  return row(y, from, to, (x) => {
    if (y === BEVEL) return STONE.bevel
    if (y === BEVEL + 1) return STONE.bevelDark
    if (y < RIM) return STONE.rim
    if (x < from + RIM - (y < RIM + 1 ? 0 : 1)) return STONE.rim
    if (x === to) return STONE.bevelDark
    if (x === to - 1) return STONE.bevel
    return STONE.face
  })
}).flat()

/** The thickness under the face (two rows, and a darker lowest one), and the shadow under it, two pixels to the right */
export const STONE_BASE: Rect[] = [
  ...[DEPTH, DEPTH + 1, DEPTH + 2].flatMap((y) => row(y, indent(y), W - 1 - indent(y), () => (y === DEPTH + 2 ? STONE.depthLow : STONE.depth))),
  ...[SHADOW, SHADOW + 1].flatMap((y) => row(y, indent(y) + 2, W + 1 - indent(y), () => STONE.shadow)),
]
