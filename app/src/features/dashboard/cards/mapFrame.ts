import { seededRandom } from '../../../lib/seededRandom'

// A map's Dashboard card, in pixel art, in three layers (cardFaces.tsx stacks them): a sheet of old paper with a torn, slightly cracked edge
// in a frame of four wooden planks, the map (smooth, not pixel art) printed on the paper. The frame (FRAME_PIXELS): two horizontal planks
// across the top and bottom and two vertical ones down the sides, crossing at the corners with their ends sticking out a little, the
// horizontal ones in front (casting a shadow on the vertical ones), a nail through each crossing; each plank outlined, its grain running
// along it, its outer row lighter. The paper (paperPixels): speckled, darker along its torn edge, on the dark backing behind it. The marks
// (paperMarks): its folds, and a few cracks running in from its edge. Each map has its own paper (its id is the seed); the frame is the same
// on every card. FRAME_SIZE × FRAME_SIZE pixels of FRAME_PIXEL px each: the cards' pixel, so four cards fill a Dashboard row (book.ts uses it too).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const FRAME = {
  /** The planks' outline: a mid-dark brown, close to the desk, so the frame sits into it */
  outline: '#4a3423',
  /** The wood: its two tones, its grain (darker and lighter streaks), knots, and the shadow a horizontal plank casts on a vertical one */
  wood: '#4e3828',
  woodAlt: '#45311f',
  grainDark: '#3a2a1c',
  grainLight: '#5e4430',
  knot: '#2a1d15',
  joint: '#33241a',
  /** The nails at the crossings, dull aged iron: their light top left, and the rest of their head */
  nailLight: '#76654c',
  nail: '#4e3f2e',
  /** The backing behind the paper (what shows through its tears and cracks) */
  backing: '#0a0604',
  /** The paper: its colour, speckles a little darker and lighter (and its stains), and its aged edge */
  paper: '#c6b38c',
  paperDark: '#b29d75',
  paperLight: '#d4c4a0',
  paperEdge: '#8a7049',
  /** A fold: its crease (in shade) and the light ridge beside it */
  crease: 'rgb(55 30 12 / 0.28)',
  ridge: 'rgb(255 238 205 / 0.14)',
  /** The torn fibres along a crack */
  fibre: '#d6c4a0',
  /** The shadow the frame casts on the paper, along the top and left */
  shadow: 'rgb(0 0 0 / 0.5)',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down): the 240px card at FRAME_PIXEL px a pixel */
export const FRAME_SIZE = 64
export const FRAME_PIXEL = 3.75
/** How wide a plank is (pixels): its outline on each side and two of wood */
const PLANK = 4
/** How far the planks' ends stick out past the ones they cross (pixels) */
const OVERHANG = 2
/** Where the bottom plank's middle is (pixels from the top): where a map card's name sign is centred */
export const BOTTOM_PLANK_MIDDLE = FRAME_SIZE - OVERHANG - PLANK / 2
/** How far in from the card's edge the frame reaches (pixels): the overhang and a plank */
export const FRAME_BORDER = OVERHANG + PLANK
/** Where the paper lies (a pixel in from the planks, the backing showing between, the planks' shadow on its top and left edges) and where
 *  the map printed on it starts (a margin of paper round it) */
const PAPER_FROM = FRAME_BORDER + 1
export const MAP_INSET = PAPER_FROM + 3
/** The map's size in pixels */
export const MAP_GRID = FRAME_SIZE - 2 * MAP_INSET

type Rect = [x: number, y: number, w: number, h: number, fill: string]
const LAST = FRAME_SIZE - 1

/** Whether pixel (x, y) is in the frame's opening (where the paper lies) */
const inOpening = (x: number, y: number) => x >= FRAME_BORDER && y >= FRAME_BORDER && x <= LAST - FRAME_BORDER && y <= LAST - FRAME_BORDER

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

/** The planks' grain: for each plank (top, bottom, left, right) and each of its two rows of wood, a colour per pixel along it, in streaks */
const GRAIN: string[][][] = (() => {
  const next = seededRandom('map-frame-wood')
  return [0, 1, 2, 3].map(() =>
    [0, 1].map((row) => {
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

/** Which plank a row (or column) is in: 0 the first (top or left), 1 the second, and how far across it; none: in neither */
function plankAt(v: number): { index: number; across: number } | null {
  if (v >= OVERHANG && v < OVERHANG + PLANK) return { index: 0, across: v - OVERHANG }
  if (v > LAST - OVERHANG - PLANK && v <= LAST - OVERHANG) return { index: 1, across: v - (LAST - OVERHANG - PLANK + 1) }
  return null
}

/** A pixel of a plank: `across` it (0 and PLANK - 1 its outline), `along` it (0 and LAST its ends); its corners rounded off */
function plankPixel(plank: number, across: number, along: number, outer: boolean): string | null {
  const end = along === 0 || along === LAST
  const edge = across === 0 || across === PLANK - 1
  if (end && edge) return null
  if (end || edge) return FRAME.outline
  const row = across - 1
  const grain = GRAIN[plank][row][along]
  // its outer row a touch lighter
  return outer && row === (plank === 1 || plank === 3 ? 1 : 0) && grain === FRAME.wood ? FRAME.grainLight : grain
}

/** The colour of a pixel of the frame (none: off the planks and out of the paper's shadow) */
function woodAt(x: number, y: number): string | null {
  const h = plankAt(y)
  const v = plankAt(x)
  // A crossing: the horizontal plank in front, with a nail through the middle of it
  if (h && v) {
    const [nx, ny] = [v.across, h.across]
    if (nx >= 1 && nx <= 2 && ny >= 1 && ny <= 2) return nx === 1 && ny === 1 ? FRAME.nailLight : FRAME.nail
  }
  if (h) return plankPixel(h.index, h.across, x, true)
  if (v) {
    // just under the top plank, its shadow
    if (y === OVERHANG + PLANK && v.across > 0 && v.across < PLANK - 1) return FRAME.joint
    return plankPixel(2 + v.index, v.across, y, true)
  }
  // The paper: the planks' shadow along its top and left
  if (inOpening(x, y) && x >= PAPER_FROM && y >= PAPER_FROM && (y === PAPER_FROM || x === PAPER_FROM)) return FRAME.shadow
  return null
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
    if (!inOpening(x, y)) return null
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
