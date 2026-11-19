import { seededRandom } from '../../../lib/seededRandom'

// A map's Dashboard card: its preview in a pixel-art parchment frame, like an old game's panel (the panel without its label or the items on
// it): a pale paper margin inside a dark brown outline, a thin double brown border with ties across it, and corners that step inward
// (a small square notch cut out of each, every ring of the frame going round it). The frame fills the card's square,
// FRAME_SIZE × FRAME_SIZE pixels of FRAME_PIXEL px each: the same size as the Dashboard's other pixel art (book.ts). The map lies under it
// (cardFaces.tsx), showing through its opening.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FRAME = {
  /** The dark outline round the outside */
  outline: '#6e4a2a',
  /** The paper margin, and its speckles (a little darker and lighter) */
  paper: '#ead0a4',
  paperDark: '#dfc192',
  paperLight: '#f3dfb8',
  /** The double border: its outer line, the band between, its inner line, and the ties across the band */
  lineOuter: '#a27a4d',
  band: '#d8b886',
  lineInner: '#8d6840',
  /** The light paper edge round the opening */
  edge: '#f2dcb2',
  /** The shadow the frame casts on the map, along the opening's top and left */
  shadow: 'rgb(60 35 10 / 0.3)',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down) the frame: the 192px card at FRAME_PIXEL px a pixel */
export const FRAME_SIZE = 64
export const FRAME_PIXEL = 3
/** How thick the border is, in pixels, from the outside to the opening: outline, paper, outer line, band, inner line, light edge */
export const FRAME_BORDER = 6
/** How big the square notch cut out of each corner is (pixels), for the outline; each ring further in goes round it, one more */
const NOTCH = 4
/** Where along each side the ties cross the band (fractions of the side) */
const TIES = [0.25, 0.5, 0.75]

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** Whether pixel (x, y) is in ring `i` or further in: inside the square inset by `i`, and out of the notch round each corner */
function inside(x: number, y: number, i: number): boolean {
  if (x < i || y < i || x > FRAME_SIZE - 1 - i || y > FRAME_SIZE - 1 - i) return false
  const cx = Math.min(x, FRAME_SIZE - 1 - x)
  const cy = Math.min(y, FRAME_SIZE - 1 - y)
  return cx >= NOTCH + i || cy >= NOTCH + i
}

/** How deep in the frame a pixel is: 0 outside it, 1 to FRAME_BORDER its rings (outline, paper, outer line, band, inner line, edge), one more
 *  the opening's first ring (where the shadow falls), then the rest of it */
function depth(x: number, y: number): number {
  let level = 0
  while (level <= FRAME_BORDER + 1 && inside(x, y, level)) level++
  return level
}

/** Whether a band pixel is at a tie: where along its side it is (the nearest side) is one of TIES */
function isTie(x: number, y: number): boolean {
  const horizontal = Math.min(y, FRAME_SIZE - 1 - y) <= Math.min(x, FRAME_SIZE - 1 - x)
  const along = horizontal ? x : y
  return TIES.some((t) => Math.abs(along - Math.round(t * (FRAME_SIZE - 1))) <= 1)
}

/** The colour of a pixel of the frame (none: outside it, or the opening) */
function colourOf(x: number, y: number, next: () => number): string | null {
  const d = depth(x, y)
  // Which side is nearest: the top or left (where the shadow falls on the map), or the bottom or right
  const lit = Math.min(x, y) < Math.min(FRAME_SIZE - 1 - x, FRAME_SIZE - 1 - y)
  switch (d) {
    case 0:
      return null
    case 1:
      return FRAME.outline
    case 2: {
      const roll = next()
      return roll < 0.15 ? FRAME.paperDark : roll < 0.3 ? FRAME.paperLight : FRAME.paper
    }
    case 3:
      return FRAME.lineOuter
    case 4:
      return isTie(x, y) ? FRAME.lineInner : FRAME.band
    case 5:
      return FRAME.lineInner
    case 6:
      return FRAME.edge
    case 7:
      return lit ? FRAME.shadow : null
    default:
      return null
  }
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
/** A tear: the gap (dark brown, as if the frame's back showed through), and the faint crease it leaves a pixel further in */
const CRACK_LINE = 'rgb(60 38 18 / 0.7)'
const CRACK_CREASE = 'rgb(60 38 18 / 0.2)'

/** The first and last pixel of the opening, across and down */
const OPEN_FROM = FRAME_BORDER
const OPEN_TO = FRAME_SIZE - 1 - FRAME_BORDER

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
