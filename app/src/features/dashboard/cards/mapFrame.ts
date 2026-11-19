import { seededRandom } from '../../../lib/seededRandom'

// A map's Dashboard card, in pixel art, in three layers (cardFaces.tsx stacks them): a sheet of old paper with a torn, slightly cracked edge
// filling a thin wooden frame, the map (smooth, not pixel art) printed on the paper. The frame (FRAME_PIXELS): a dark outline, two pixels of wood with its grain
// running along each side, mitred at the corners and stepped round a small notch in each (like an old game's panel), lighter on its outer
// top and left and darker by the opening, and a dark lip inside it. The paper (paperPixels): speckled, darker along its torn edge, on the
// dark backing the frame holds. The marks (paperMarks): its folds, and a few cracks running in from its edge. Each map has its own
// paper (its id is the seed); the frame is the same on every card. FRAME_SIZE × FRAME_SIZE pixels of FRAME_PIXEL px each: the size of the
// Dashboard's other pixel art (book.ts).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FRAME = {
  /** The dark outline round the outside, and the lip inside the wood */
  outline: '#2f1b0c',
  lip: '#3d2411',
  /** The wood: its two tones, its grain (darker and lighter streaks), knots, and the joint at the mitred corners */
  wood: '#8c5a2c',
  woodAlt: '#7f5027',
  grainDark: '#6a411e',
  grainLight: '#a26b37',
  knot: '#4f3016',
  joint: '#553317',
  /** The bevels: the outer edge's light (top, left) and dark (bottom, right), and the inner edge's */
  bevelLight: '#b8824a',
  bevelDark: '#5a3819',
  innerLight: '#9c6634',
  innerDark: '#4e2f15',
  /** The backing behind the paper (what shows through its tears and cracks) */
  backing: '#2b190b',
  /** The paper: its colour, speckles a little darker and lighter (and its stains), and its aged edge */
  paper: '#eddab0',
  paperDark: '#e2cb9b',
  paperLight: '#f5e8c8',
  paperEdge: '#cfb07a',
  /** A fold: its crease (in shade) and the light ridge beside it */
  crease: 'rgb(110 70 30 / 0.16)',
  ridge: 'rgb(255 250 235 / 0.28)',
  /** The torn fibres along a crack */
  fibre: '#f7edd4',
  /** The shadow the frame casts on the paper, along the top and left */
  shadow: 'rgb(40 20 5 / 0.3)',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down): the 192px card at FRAME_PIXEL px a pixel */
export const FRAME_SIZE = 64
export const FRAME_PIXEL = 3
/** How thick the frame is, in pixels: outline, two of wood, lip */
export const FRAME_BORDER = 4
/** How big the square notch cut out of each corner is (pixels), for the outline; each ring further in goes round it, one more */
const NOTCH = 3
/** Where the paper lies (filling the frame's opening, its edge under the lip's shadow) and where the map printed on it starts (a margin of
 *  paper round it) */
const PAPER_FROM = FRAME_BORDER
export const MAP_INSET = PAPER_FROM + 3
/** The map's size in pixels */
export const MAP_GRID = FRAME_SIZE - 2 * MAP_INSET

type Rect = [x: number, y: number, w: number, h: number, fill: string]
const LAST = FRAME_SIZE - 1

/** Whether pixel (x, y) is in ring `i` or further in: inside the square inset by `i`, and out of the notch round each corner */
function inside(x: number, y: number, i: number): boolean {
  if (x < i || y < i || x > LAST - i || y > LAST - i) return false
  return Math.min(x, LAST - x) >= NOTCH + i || Math.min(y, LAST - y) >= NOTCH + i
}

/** How deep in the frame a pixel is: 0 outside it, 1 the outline, 2 to FRAME_BORDER - 1 the wood, FRAME_BORDER the lip, one more the
 *  opening's first ring, then the rest of it */
function depth(x: number, y: number): number {
  let level = 0
  while (level <= FRAME_BORDER + 1 && inside(x, y, level)) level++
  return level
}

/** Pixels as rectangles: each run of one colour along a row is one */
function runs(colourAt: (x: number, y: number) => string | null): Rect[] {
  const rects: Rect[] = []
  for (let y = 0; y < FRAME_SIZE; y++) {
    let run: Rect | null = null
    for (let x = 0; x < FRAME_SIZE; x++) {
      const colour = colourAt(x, y)
      if (run && colour === run[4]) run[2]++
      else {
        if (run) rects.push(run)
        run = colour ? [x, y, 1, 1, colour] : null
      }
    }
    if (run) rects.push(run)
  }
  return rects
}

/** The wood's grain: for each side (top, bottom, left, right) and each of its three middle rows, a colour per pixel along it, in streaks */
const GRAIN: string[][][] = (() => {
  const next = seededRandom('map-frame-wood')
  return [0, 1, 2, 3].map(() =>
    [0, 1, 2].map((row) => {
      const base = row === 1 ? FRAME.woodAlt : FRAME.wood
      const line: string[] = []
      while (line.length < FRAME_SIZE) {
        const roll = next()
        const colour = roll < 0.22 ? FRAME.grainDark : roll < 0.38 ? FRAME.grainLight : base
        const length = colour === base ? 3 + Math.floor(next() * 8) : 2 + Math.floor(next() * 6)
        for (let i = 0; i < length; i++) line.push(colour)
        if (next() < 0.06) line.push(FRAME.knot)
      }
      return line
    }),
  )
})()

/** The colour of a pixel of the frame (none: outside it, or its opening) */
function woodAt(x: number, y: number): string | null {
  const d = depth(x, y)
  const fromTop = Math.min(y, LAST - y)
  const fromSide = Math.min(x, LAST - x)
  // The top or left (towards the light), or the bottom or right
  const lit = Math.min(x, y) < Math.min(LAST - x, LAST - y)
  if (d === 0) return null
  if (d === 1) return FRAME.outline
  if (d === FRAME_BORDER) return FRAME.lip
  if (d > FRAME_BORDER) return d === FRAME_BORDER + 1 && lit ? FRAME.shadow : null
  // The wood: grained along its side, its outer row lit on the top and left (and shaded on the bottom and right) where it is thick
  // enough for bevels, the corners' mitres a darker joint
  const ring = d - 2
  const rings = FRAME_BORDER - 2
  if (rings >= 3 && ring === 0) return lit ? FRAME.bevelLight : FRAME.bevelDark
  if (rings >= 3 && ring === rings - 1) return lit ? FRAME.innerDark : FRAME.innerLight
  if (fromTop === fromSide) return FRAME.joint
  const horizontal = fromTop < fromSide
  const side = horizontal ? (y < FRAME_SIZE / 2 ? 0 : 1) : x < FRAME_SIZE / 2 ? 2 : 3
  const grain = GRAIN[side][(rings >= 3 ? ring - 1 : ring) % GRAIN[side].length][horizontal ? x : y]
  // a thin frame: its outer row a touch lighter on the lit sides, its inner a touch darker on the others
  if (rings < 3 && grain !== FRAME.knot) {
    if (ring === 0 && lit && grain === FRAME.wood) return FRAME.grainLight
    if (ring === rings - 1 && !lit && grain === FRAME.woodAlt) return FRAME.grainDark
  }
  return grain
}

/** The frame's pixels (the same on every card) */
export const FRAME_PIXELS: Rect[] = runs(woodAt)

/** How much is torn off each side of a map's paper, at each pixel along it: none mostly, a pixel now and then, two rarely */
function tornEdges(next: () => number): number[][] {
  return [0, 1, 2, 3].map(() => Array.from({ length: FRAME_SIZE }, () => {
    const roll = next()
    return roll < 0.88 ? 0 : roll < 0.98 ? 1 : 2
  }))
}

/**
 * A map's paper, under its map: the backing filling the frame's opening, and the sheet on it, a pixel in from the frame, its edges torn
 * (tornEdges), the pixels along them darker (aged), the rest speckled, with a stain or two.
 */
export function paperPixels(seed: string): Rect[] {
  const next = seededRandom(`${seed}:paper`)
  const [top, bottom, left, right] = tornEdges(next)
  const to = LAST - PAPER_FROM
  const onPaper = (x: number, y: number) =>
    x >= PAPER_FROM + left[y] && x <= to - right[y] && y >= PAPER_FROM + top[x] && y <= to - bottom[x] &&
    // its corners a little rounded off by wear
    !((x === PAPER_FROM || x === to) && (y === PAPER_FROM || y === to))
  const stains = Array.from({ length: 2 }, () => ({ x: PAPER_FROM + next() * (to - PAPER_FROM), y: PAPER_FROM + next() * (to - PAPER_FROM), r: 3 + next() * 4 }))
  const speck = seededRandom(`${seed}:speck`)
  return runs((x, y) => {
    if (depth(x, y) <= FRAME_BORDER) return null
    if (!onPaper(x, y)) return FRAME.backing
    if (!onPaper(x - 1, y) || !onPaper(x + 1, y) || !onPaper(x, y - 1) || !onPaper(x, y + 1)) return FRAME.paperEdge
    if (stains.some((s) => (x - s.x) ** 2 + (y - s.y) ** 2 < s.r * s.r)) return FRAME.paperDark
    const roll = speck()
    return roll < 0.12 ? FRAME.paperDark : roll < 0.24 ? FRAME.paperLight : FRAME.paper
  })
}

/** How many cracks a map's paper has, and how far in (pixels) the longest goes from its edge */
export const CRACK_COUNT = 4
export const CRACK_REACH = 4

/**
 * What lies over a map's paper and its map: the two folds across it (a crease in shade, a light ridge beside it), and a few
 * small cracks running in from the paper's edge into the map, narrowing to a point, with light torn fibres along them.
 */
export function paperMarks(seed: string): Rect[] {
  const next = seededRandom(`${seed}:marks`)
  const to = LAST - PAPER_FROM
  const middle = Math.floor(FRAME_SIZE / 2)
  const span = to - PAPER_FROM + 1
  const rects: Rect[] = [
    [middle - 1, PAPER_FROM + 1, 1, span - 2, FRAME.crease],
    [middle, PAPER_FROM + 1, 1, span - 2, FRAME.ridge],
    [PAPER_FROM + 1, middle - 1, span - 2, 1, FRAME.crease],
    [PAPER_FROM + 1, middle, span - 2, 1, FRAME.ridge],
  ]
  for (let c = 0; c < CRACK_COUNT; c++) {
    const side = Math.floor(next() * 4)
    const along = MAP_INSET + 3 + Math.floor(next() * (MAP_GRID - 6))
    const deep = 3 + Math.floor(next() * (CRACK_REACH - 2))
    const lean = next() < 0.5 ? -1 : 1
    // A pixel `k` in from the paper's edge on its side, `t` along it, as (x, y)
    const at = (k: number, t: number): [number, number] =>
      side === 0 ? [t, PAPER_FROM + k] : side === 1 ? [to - k, t] : side === 2 ? [t, to - k] : [PAPER_FROM + k, t]
    for (let k = 0; k < deep; k++) {
      const t = along + Math.floor(k / 2) * lean
      const [x, y] = at(k, t)
      rects.push([x, y, 1, 1, FRAME.backing])
      // two wide near the edge; fibres beside it further in
      const [bx, by] = at(k, t + lean)
      rects.push([bx, by, 1, 1, k < 2 ? FRAME.backing : FRAME.fibre])
    }
  }
  return rects
}
