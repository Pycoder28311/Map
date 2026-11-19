import { seededRandom } from '../../../lib/seededRandom'

// A map's Dashboard card: its preview in a pixel-art stone frame, like an old game's notice board (the board without its label, text or
// button): a thick grey border with rounded corners, a hard dark outline outside and inside it, a light bevel on its outer top and left
// edges and a dark one on its bottom and right (the other way round on its inner edges), its face speckled like stone. The frame fills the
// card's square, FRAME_SIZE × FRAME_SIZE pixels of FRAME_PIXEL px each: the same size as the Dashboard's other pixel art (book.ts). The map
// lies under it (cardFaces.tsx), showing through its opening.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FRAME = {
  /** The hard outline round the outside and the opening */
  outline: '#141416',
  inline: '#1e1e21',
  /** The stone: its face, speckles a little lighter and darker, and the bevels (light, lighter on the very edge, and dark) */
  face: '#5f6168',
  speckLight: '#6d6f77',
  speckDark: '#53555b',
  light: '#80828a',
  lighter: '#9a9ca4',
  dark: '#43444a',
  /** The shadow the frame casts on the map, along the opening's top and left */
  shadow: 'rgb(0 0 0 / 0.35)',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down) the frame: the 192px card at FRAME_PIXEL px a pixel */
export const FRAME_SIZE = 64
export const FRAME_PIXEL = 3
/** How thick the border is, in pixels, from the outside to the inline: the outline and two of stone (the inline is one more). More stone
 *  (4 and up) gets a speckled face between its bevels */
export const FRAME_BORDER = 3

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** Whether pixel (x, y) is inside the square inset by `i`, its corners rounded with radius `r` (pixel circles: what a pixel's centre is in) */
function inside(x: number, y: number, i: number, r: number): boolean {
  const n = FRAME_SIZE - 2 * i
  const u = x - i
  const v = y - i
  if (u < 0 || v < 0 || u >= n || v >= n) return false
  const cu = Math.min(u, n - 1 - u)
  const cv = Math.min(v, n - 1 - v)
  if (cu >= r || cv >= r) return true
  return (r - cu - 0.5) ** 2 + (r - cv - 0.5) ** 2 <= r * r
}

/** How deep in the frame a pixel is: 0 outside it, 1 its outline, 2 to FRAME_BORDER the stone, one more the inline, then the opening's first ring
 *  (where the shadow falls), then the rest of it */
function depth(x: number, y: number): number {
  let level = 0
  // The corners: well rounded outside, less towards the opening
  while (level <= FRAME_BORDER + 2 && inside(x, y, level, Math.max(2, 6 - level))) level++
  return level
}

/** The colour of a pixel of the frame (none: outside it, or the opening) */
function colourOf(x: number, y: number, next: () => number): string | null {
  const d = depth(x, y)
  // Which side is nearest: the top or left (towards the light), or the bottom or right
  const lit = Math.min(x, y) < Math.min(FRAME_SIZE - 1 - x, FRAME_SIZE - 1 - y)
  if (d === 0) return null
  if (d === 1) return FRAME.outline
  if (d === FRAME_BORDER + 1) return FRAME.inline
  // The opening: the map, with the frame's shadow on it along the top and left
  if (d > FRAME_BORDER + 1) return d === FRAME_BORDER + 2 && lit ? FRAME.shadow : null
  // The stone: bevelled outside (light top and left, dark bottom and right) and the other way round by the opening, speckled between (when thick enough)
  if (d === 2) return lit ? FRAME.lighter : FRAME.dark
  if (d === FRAME_BORDER) return lit ? FRAME.dark : FRAME.light
  const roll = next()
  return roll < 0.16 ? FRAME.speckLight : roll < 0.32 ? FRAME.speckDark : FRAME.face
}

/** The frame's pixels: each run of one colour along a row is one rectangle */
export const FRAME_PIXELS: Rect[] = (() => {
  let seed = 11
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const rects: Rect[] = []
  for (let y = 0; y < FRAME_SIZE; y++) {
    let run: Rect | null = null
    for (let x = 0; x < FRAME_SIZE; x++) {
      const colour = colourOf(x, y, next)
      if (run && colour === run[4]) run[2]++
      else {
        if (run) rects.push(run)
        run = colour ? [x, y, 1, 1, colour] : null
      }
    }
    if (run) rects.push(run)
  }
  return rects
})()

// ── The cracks in the map: small tears in its edge, like old paper's ────────────────────────────────────────────────────────────
/** How many tears a map has, and how deep (pixels) the deepest goes */
export const CRACK_COUNT = 9
export const CRACK_REACH = 3
/** A tear: the gap (dark, as if the frame showed through), and the faint crease it leaves a pixel further in */
const CRACK_LINE = 'rgb(30 30 33 / 0.7)'
const CRACK_CREASE = 'rgb(0 0 0 / 0.18)'

/** The first and last pixel of the opening, across and down */
const OPEN_FROM = FRAME_BORDER + 1
const OPEN_TO = FRAME_SIZE - 2 - FRAME_BORDER

/**
 * The tears of a map (its id is the seed: each map has its own, the same every time): small V-shaped nicks in the sides of the opening,
 * away from its corners, one to CRACK_REACH pixels deep, two or three wide at the edge, leaning one way or the other, with a faint crease
 * going on from the tip now and then.
 */
export function frameCracks(seed: string): Rect[] {
  const next = seededRandom(`${seed}:cracks`)
  const rects: Rect[] = []
  const span = OPEN_TO - OPEN_FROM - 10
  for (let c = 0; c < CRACK_COUNT; c++) {
    const side = Math.floor(next() * 4)
    const along = OPEN_FROM + 5 + Math.floor(next() * span)
    const deep = 1 + Math.floor(next() * CRACK_REACH)
    const lean = next() < 0.5 ? -1 : 1
    // A pixel `k` in from the side, `t` along it, as (x, y) on the card
    const at = (k: number, t: number): [number, number] =>
      side === 0 ? [t, OPEN_FROM + k] : side === 1 ? [OPEN_TO - k, t] : side === 2 ? [t, OPEN_TO - k] : [OPEN_FROM + k, t]
    for (let k = 0; k < deep; k++) {
      // wide at the edge, one pixel at the tip, drifting with its lean
      const width = k === 0 ? 2 + Math.floor(next() * 2) : 1
      const shift = Math.floor(k / 2) * lean
      for (let w = 0; w < width; w++) {
        const [x, y] = at(k, along + shift + (lean < 0 ? -w : w))
        rects.push([x, y, 1, 1, CRACK_LINE])
      }
    }
    if (next() < 0.5) {
      const [x, y] = at(deep, along + Math.floor(deep / 2) * lean + lean)
      rects.push([x, y, 1, 1, CRACK_CREASE])
    }
  }
  return rects
}
