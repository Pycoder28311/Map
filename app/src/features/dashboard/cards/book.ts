import type { CSSProperties } from 'react'

// An article's Dashboard card drawn as a pixel-art book (BookArt.tsx draws it from the pixels here): a closed tome of brown leather seen from the front (in
// the map card's colours: its outlines, its paper),
// its stitched spine along the left with rivets on the hinge, a cover with faint diamonds, grain, scratches, worn edges and a debossed border,
// stitched bands ending in brass corners, its picture in a one-pixel outline, its pages and a ribbon bookmark
// along the bottom. The book fills the card's box, BOOK_W × BOOK_H
// pixels of the drawing (a square), each BOOK_PIXEL px on screen: the same size as the Dashboard's other pixel art (DashboardRelics: SCALE). The
// card's content (its picture, title, preview and date) is laid on the cover by cardFaces.tsx, placed on the same grid with `bookAt`.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BOOK = {
  /** The hard outline round everything */
  outline: '#2f1b0c',
  /** The back cover, seen along the left, its ridges and their shade, and its stitches */
  spine: '#4f2f15',
  ridge: '#9a6634',
  ridgeShade: '#3a2210',
  stitch: '#d9b97f',
  /** The front cover: its face, the light line along its top and the shade along its right and bottom */
  cover: '#7a4a24',
  coverLight: '#946036',
  coverShade: '#62391b',
  /** The faint shapes on the cover: its grain (darker and lighter streaks), small diamonds, scratches and worn specks */
  grainDark: '#6c4020',
  grainLight: '#86542c',
  motif: '#83512a',
  scratch: '#956237',
  wear: '#a26c3c',
  /** The debossed border round the cover: its pressed line and the light line beside it */
  deboss: '#5e3619',
  emboss: '#8c5a30',
  /** The hinge, where the cover meets the spine, and its rivets */
  hinge: '#5e3619',
  rivet: '#d7d2c8',
  rivetShade: '#7d776e',
  /** The bands' dashes (a faint light top and face) and the groove they sit in */
  band: '#c9a26a',
  bandLight: '#e3c58f',
  groove: '#5e3619',
  /** The metal corners */
  gold: '#c9963e',
  goldDeep: '#8a5f22',
  goldLight: '#ecc77a',
  /** The pages' edge: its light line on top, the lines between the pages, and its shaded line below */
  pages: '#eddab0',
  pagesLight: '#f5e8c8',
  pagesLine: '#d9c296',
  pagesShade: '#cfb07a',
  /** The ribbon: in the book, its light fold, out of it, and its forked tip */
  ribbon: '#b0303f',
  ribbonFold: '#c93a45',
  ribbonLight: '#e5463a',
  ribbonTip: '#f5822a',
  /** Behind the picture (what shows when there is none), and the words there */
  picture: '#4f2f15',
  pictureInk: '#e2cb9b',
  /** The title on the cover, and its shadow */
  ink: '#f5e8c8',
  inkShadow: '#2f1b0c',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One pixel of the drawing on screen (px): the Dashboard's pixel art's size (DashboardRelics) */
export const BOOK_PIXEL = 3
/** Pixels across and down the drawing: a square, the size of every other card (192px), so a row lines up */
export const BOOK_W = 64
export const BOOK_H = 64
/** The card's box: BOOK_W × BOOK_PIXEL by BOOK_H × BOOK_PIXEL (192 × 192px) */
export const BOOK_SIZE = 'size-48'
/** The cover's right edge (its shaded column), where the right-hand parts are placed from */
const R = BOOK_W - 2

/** Where something on the cover goes, in pixels of the drawing (from the top left): its absolute position as percentages of the card */
export function bookAt(x: number, y: number, w: number, h: number): CSSProperties {
  const pct = (n: number, of: number) => `${(n / of) * 100}%`
  return { position: 'absolute', left: pct(x, BOOK_W), top: pct(y, BOOK_H), width: pct(w, BOOK_W), height: pct(h, BOOK_H) }
}

/** The picture's box on the cover: a one-pixel outline, the picture filling the rest */
export const BOOK_FRAME = { x: 10, y: 8, w: 47, h: 27 } as const
/** The title, under the picture, above the bottom band */
export const BOOK_TITLE = { x: 10, y: 37, w: 47, h: 10 } as const

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** A small seeded random (the same pixels on every book) */
function seeded(start: number) {
  let seed = start
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
}

/** A band across the cover at `y`: a faint groove, and thin dashes in it (a light top and a face, two pixels tall), ending by the gold corner */
const band = (y: number): Rect[] => [
  [9, y + 1, R - 16, 1, BOOK.groove],
  ...[9, 18, 27, 36, 45].flatMap((x): Rect[] => [
    [x + 1, y, 5, 1, BOOK.bandLight],
    [x, y + 1, 7, 1, BOOK.band],
  ]),
]

/** A gold corner: an L two pixels thick along the top (or bottom) and the right, a light glint, a darker tip and inner corner */
const corner = (y: number, down: boolean): Rect[] => {
  const edge = down ? y + 4 : y
  return [
    [R - 6, edge, 5, 2, BOOK.gold],
    [R - 3, y, 2, 6, BOOK.gold],
    [R - 6, down ? edge + 1 : edge, 1, 1, BOOK.goldLight],
    [R - 2, down ? edge + 1 : edge, 1, 1, BOOK.goldDeep],
    [R - 4, down ? edge - 1 : edge + 2, 1, 1, BOOK.goldDeep],
  ]
}

/** The cover's grain, like worn leather: short faint streaks across it, a step off their row now and then */
function grain(): Rect[] {
  const next = seeded(7)
  const rects: Rect[] = []
  for (let y = 2; y < 62; y += 2) {
    for (let x = 9 + Math.floor(next() * 6); x < R - 2; x += 5 + Math.floor(next() * 9)) {
      const length = Math.min(2 + Math.floor(next() * 5), R - 1 - x)
      rects.push([x, y + (next() < 0.3 ? 1 : 0), length, 1, next() < 0.6 ? BOOK.grainDark : BOOK.grainLight])
    }
  }
  return rects
}

/** A faint pattern of small diamonds over the cover (each a ring of four pixels), every other row of them shifted half a step */
function diamonds(): Rect[] {
  const rects: Rect[] = []
  for (let row = 0, cy = 9; cy < 60; row++, cy += 6) {
    for (let cx = 12 + (row % 2) * 4; cx < R - 2; cx += 8) {
      rects.push([cx, cy - 1, 1, 1, BOOK.motif], [cx - 1, cy, 1, 1, BOOK.motif], [cx + 1, cy, 1, 1, BOOK.motif], [cx, cy + 1, 1, 1, BOOK.motif])
    }
  }
  return rects
}

/** A few faint scratches on the cover, diagonal: where each starts, how long, and which way it slopes (1: down, -1: up) */
const SCRATCHES: [x: number, y: number, length: number, slope: 1 | -1][] = [
  [11, 38, 4, 1],
  [26, 46, 3, -1],
  [42, 35, 4, 1],
  [57, 44, 3, -1],
  [52, 39, 3, 1],
  [35, 41, 2, 1],
  [R - 5, 14, 3, 1],
]
const scratches = (): Rect[] => SCRATCHES.flatMap(([x, y, length, slope]) => Array.from({ length }, (_, i): Rect => [x + i, y + i * slope, 1, 1, BOOK.scratch]))

/** Worn specks: lighter pixels along the cover's top and right edges, where it rubs */
function wear(): Rect[] {
  const next = seeded(23)
  const rects: Rect[] = []
  for (let x = 9; x < R - 1; x += 2 + Math.floor(next() * 5)) rects.push([x, 2, 1 + Math.floor(next() * 2), 1, BOOK.wear])
  for (let y = 10; y < 46; y += 2 + Math.floor(next() * 5)) rects.push([R - 1, y, 1, 1 + Math.floor(next() * 2), BOOK.wear])
  return rects
}

/** The debossed border round the cover's middle: a pressed line with a light line inside it (the parts not under the picture and text) */
const border = (): Rect[] => [
  [8, 6, R - 9, 1, BOOK.deboss],
  [8, 48, R - 9, 1, BOOK.deboss],
  [8, 6, 1, 43, BOOK.deboss],
  [R - 2, 9, 1, 37, BOOK.deboss],
  [9, 7, R - 11, 1, BOOK.emboss],
  [9, 7, 1, 41, BOOK.emboss],
]

/** The hinge's rivets: a light head with a shaded lower right */
const rivets = (): Rect[] => [13, 28, 43].flatMap((y): Rect[] => [
  [5, y, 2, 2, BOOK.rivet],
  [6, y + 1, 1, 1, BOOK.rivetShade],
])

/** The spine: its ridges (a light line, a shade under it) and its stitches down the middle between them */
const spine = (): Rect[] => [
  ...[7, 10, 53, 56].flatMap((y): Rect[] => [
    [1, y, 3, 1, BOOK.ridge],
    [1, y + 1, 3, 1, BOOK.ridgeShade],
  ]),
  ...Array.from({ length: 8 }, (_, i): Rect => [2, 15 + i * 5, 1, 2, BOOK.stitch]),
]

/** The pages' edge: lines between the pages, broken here and there */
function pageLines(): Rect[] {
  const next = seeded(41)
  const rects: Rect[] = []
  for (const y of [55, 57]) {
    for (let x = 5 + Math.floor(next() * 4); x < R - 4; x += 6 + Math.floor(next() * 8)) rects.push([x, y, Math.min(3 + Math.floor(next() * 8), R - 3 - x), 1, BOOK.pagesLine])
  }
  return rects
}

/** The pixels of the book, back to front */
export const BOOK_PIXELS: Rect[] = [
  // The spine (the back cover, seen along the left), its top and bottom stepping in to the cover's corners
  [1, 3, 1, 58, BOOK.spine],
  [2, 2, 2, 60, BOOK.spine],
  ...spine(),
  // The front cover: its face, a light line along the top, a shade along the right and bottom, the hinge and its rivets
  [4, 1, R - 3, 62, BOOK.cover],
  [4, 1, R - 3, 1, BOOK.coverLight],
  [R, 1, 1, 62, BOOK.coverShade],
  [4, 62, R - 3, 1, BOOK.coverShade],
  [4, 1, 3, 62, BOOK.hinge],
  [7, 2, 1, 60, BOOK.coverLight],
  ...rivets(),
  // The faint shapes on the cover
  ...diamonds(),
  ...grain(),
  ...scratches(),
  ...wear(),
  ...border(),
  // The bands, ending in the gold corners
  ...band(3),
  ...band(50),
  ...corner(2, false),
  ...corner(47, true),
  // The picture's outline
  [BOOK_FRAME.x, BOOK_FRAME.y, BOOK_FRAME.w, BOOK_FRAME.h, BOOK.outline],
  // The pages' edge, between the cover's bottom rows
  [4, 54, R - 6, 5, BOOK.pages],
  [4, 54, R - 6, 1, BOOK.pagesLight],
  ...pageLines(),
  [4, 58, R - 6, 1, BOOK.pagesShade],
  // The outline: top, right, bottom, and the spine's left with its steps
  [4, 0, BOOK_W - 4, 1, BOOK.outline],
  [BOOK_W - 1, 1, 1, 63, BOOK.outline],
  [4, 63, BOOK_W - 4, 1, BOOK.outline],
  [0, 3, 1, 58, BOOK.outline],
  [1, 2, 1, 1, BOOK.outline],
  [2, 1, 2, 1, BOOK.outline],
  [1, 61, 1, 1, BOOK.outline],
  [2, 62, 2, 1, BOOK.outline],
  // The ribbon: in the pages (a lighter fold down its left), out over the bottom of the cover, its forked tip on the bottom edge
  [14, 54, 6, 5, BOOK.ribbon],
  [14, 54, 1, 5, BOOK.ribbonFold],
  [14, 59, 6, 2, BOOK.ribbonLight],
  [14, 61, 6, 1, BOOK.ribbonTip],
  [14, 62, 2, 1, BOOK.ribbonTip],
  [18, 62, 2, 1, BOOK.ribbonTip],
  [14, 63, 1, 1, BOOK.ribbonTip],
  [19, 63, 1, 1, BOOK.ribbonTip],
]
