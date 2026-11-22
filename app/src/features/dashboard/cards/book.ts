import type { CSSProperties } from 'react'

// An article's Dashboard card drawn as a pixel-art book (BookArt.tsx draws it from the pixels here): a closed tome of brown leather seen from the front (in
// the map card's colours: its outlines, its paper),
// its stitched spine along the left with rivets on the hinge, a cover with faint diamonds, grain, scratches, worn edges and a debossed border,
// stitched bands ending in brass corners, its picture in a one-pixel outline, its pages and a ribbon bookmark
// along the bottom. The book fills the card's box, BOOK_W × BOOK_H
// pixels of the drawing (4:5, taller than wide, as tall as the other cards), each BOOK_PIXEL px on screen: the cards' pixel (mapFrame.ts FRAME_PIXEL). The
// card's content (its picture, title, preview and date) is laid on the cover by cardFaces.tsx, placed on the same grid with `bookAt`.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BOOK = {
  /** The hard outline round everything */
  outline: '#0d0806',
  /** The back cover, seen along the left, its ridges and their shade, and its stitches */
  spine: '#562917',
  ridge: '#954b28',
  ridgeShade: '#100905',
  stitch: '#6e5f4c',
  /** The front cover: its face, the light line along its top and the shade along its right and bottom */
  cover: '#7e3922',
  coverLight: '#9a492d',
  coverShade: '#612a18',
  /** The faint shapes on the cover: its grain (darker and lighter streaks), small diamonds, scratches and worn specks */
  grainDark: '#6d301e',
  grainLight: '#8e4229',
  motif: '#8b3f28',
  scratch: '#a95332',
  wear: '#b75f3b',
  /** The debossed border round the cover: its pressed line and the light line beside it */
  deboss: '#562513',
  emboss: '#94472c',
  /** The hinge, where the cover meets the spine, and its rivets */
  hinge: '#612a18',
  rivet: '#8d8b86',
  rivetShade: '#3b3936',
  /** The bands' dashes (one pixel tall, a muted stitch close to the leather) and the groove they sit in */
  band: '#765437',
  groove: '#170d08',
  /** The metal corners */
  gold: '#a17b2f',
  goldDeep: '#5d4413',
  goldLight: '#c3a767',
  /** The pages' edge: its light line on top, the lines between the pages, and its shaded line below */
  pages: '#b6a585',
  pagesLight: '#c9bb9a',
  pagesLine: '#9a8868',
  pagesShade: '#807055',
  /** The ribbon: in the book, its light fold, out of it, and its forked tip */
  ribbon: '#5a0e16',
  ribbonFold: '#70161f',
  ribbonLight: '#842028',
  ribbonTip: '#9a2a2c',
  /** Behind the picture (what shows when there is none), and the words there */
  picture: '#110a06',
  pictureInk: '#8e7c62',
  /** The title on the cover, and its shadow */
  ink: '#d9cdb4',
  inkShadow: '#000000',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** One pixel of the drawing on screen (px): the cards' pixel (mapFrame.ts FRAME_PIXEL), so four cards fill a row */
export const BOOK_PIXEL = 3.75
/** Pixels across and down the drawing: 4:5 (as near as whole pixels go), as tall as every other card (240px), so a row lines up */
export const BOOK_W = 51
export const BOOK_H = 64
/** The card's box: BOOK_W × BOOK_PIXEL by BOOK_H × BOOK_PIXEL (191.25 × 240px) */
export const BOOK_SIZE = 'h-60 w-[191.25px]'
/** The cover's right edge (its shaded column), where the right-hand parts are placed from */
const R = BOOK_W - 2
/** The cover's left edge, past the spine (one pixel, and its outline) */
const C = 2
/** The bottom row (the outline), where the bottom parts are placed from */
const B = BOOK_H - 1

/** Where something on the cover goes, in pixels of the drawing (from the top left): its absolute position as percentages of the card */
export function bookAt(x: number, y: number, w: number, h: number): CSSProperties {
  const pct = (n: number, of: number) => `${(n / of) * 100}%`
  return { position: 'absolute', left: pct(x, BOOK_W), top: pct(y, BOOK_H), width: pct(w, BOOK_W), height: pct(h, BOOK_H) }
}

/** The picture's box on the cover: a one-pixel outline, the picture filling the rest */
export const BOOK_FRAME = { x: 10, y: 8, w: R - 13, h: 27 } as const
/** The title, under the picture, above the bottom band */
export const BOOK_TITLE = { x: 8, y: 36, w: R - 9, h: 11 } as const
/** Where the bottom band is (its groove row), and the debossed border's bottom line above it */
const BAND_LOW = B - 9
const BORDER_LOW = B - 12

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** A small seeded random (the same pixels on every book) */
function seeded(start: number) {
  let seed = start
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
}

/** A band across the cover, its groove on row `y`: a faint groove, and dashes in it one pixel tall (a muted stitch), ending by the brass corner */
const band = (y: number): Rect[] => [
  [9, y, R - 16, 1, BOOK.groove],
  ...Array.from({ length: Math.floor((R - 15) / 9) }, (_, i): Rect => [9 + i * 9, y, 7, 1, BOOK.band]),
]

/** A brass corner: an L two pixels thick along the top (or bottom) and the right, a light glint, a darker tip and inner corner. `y` its
 *  top row; `down`: the bottom one (its foot along its bottom) */
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
  for (let y = 2; y < B - 2; y += 2) {
    for (let x = 8 + Math.floor(next() * 6); x < R - 2; x += 5 + Math.floor(next() * 9)) {
      const length = Math.min(2 + Math.floor(next() * 5), R - 1 - x)
      rects.push([x, y + (next() < 0.3 ? 1 : 0), length, 1, next() < 0.6 ? BOOK.grainDark : BOOK.grainLight])
    }
  }
  return rects
}

/** A faint pattern of small diamonds over the cover (each a ring of four pixels), every other row of them shifted half a step */
function diamonds(): Rect[] {
  const rects: Rect[] = []
  for (let row = 0, cy = 9; cy < B - 4; row++, cy += 6) {
    for (let cx = 11 + (row % 2) * 4; cx < R - 2; cx += 8) {
      rects.push([cx, cy - 1, 1, 1, BOOK.motif], [cx - 1, cy, 1, 1, BOOK.motif], [cx + 1, cy, 1, 1, BOOK.motif], [cx, cy + 1, 1, 1, BOOK.motif])
    }
  }
  return rects
}

/** A few faint scratches on the cover, diagonal: where each starts, how long, and which way it slopes (1: down, -1: up) */
const SCRATCHES: [x: number, y: number, length: number, slope: 1 | -1][] = [
  [11, 38, 4, 1],
  [24, 46, 3, -1],
  [34, 37, 4, 1],
  [R - 7, 45, 3, -1],
  [29, 42, 2, 1],
  [R - 5, 14, 3, 1],
]
const scratches = (): Rect[] => SCRATCHES.flatMap(([x, y, length, slope]) => Array.from({ length }, (_, i): Rect => [x + i, y + i * slope, 1, 1, BOOK.scratch]))

/** Worn specks: lighter pixels along the cover's top and right edges, where it rubs */
function wear(): Rect[] {
  const next = seeded(23)
  const rects: Rect[] = []
  for (let x = 8; x < R - 1; x += 2 + Math.floor(next() * 5)) rects.push([x, 2, 1 + Math.floor(next() * 2), 1, BOOK.wear])
  for (let y = 10; y < BORDER_LOW - 2; y += 2 + Math.floor(next() * 5)) rects.push([R - 1, y, 1, 1 + Math.floor(next() * 2), BOOK.wear])
  return rects
}

/** The debossed border round the cover's middle: a pressed line with a light line inside it (the parts not under the picture and title) */
const border = (): Rect[] => [
  [7, 6, R - 8, 1, BOOK.deboss],
  [7, BORDER_LOW, R - 8, 1, BOOK.deboss],
  [7, 6, 1, BORDER_LOW - 5, BOOK.deboss],
  [R - 2, 9, 1, BORDER_LOW - 11, BOOK.deboss],
  [8, 7, R - 10, 1, BOOK.emboss],
  [8, 7, 1, BORDER_LOW - 7, BOOK.emboss],
]

/** The hinge's rivets: a light head with a shaded lower right */
const rivets = (): Rect[] => [13, Math.round(BOOK_H / 2) - 4, B - 20].flatMap((y): Rect[] => [
  [C + 1, y, 2, 2, BOOK.rivet],
  [C + 2, y + 1, 1, 1, BOOK.rivetShade],
])

/** The spine (two pixels wide): its ridges (a light line, a shade under it) and its stitches down it between them */
const spine = (): Rect[] => [
  ...[7, 10, B - 12, B - 9].flatMap((y): Rect[] => [
    [1, y, 1, 1, BOOK.ridge],
    [1, y + 1, 1, 1, BOOK.ridgeShade],
  ]),
  ...Array.from({ length: Math.floor((B - 30) / 5) }, (_, i): Rect => [1, 15 + i * 5, 1, 2, BOOK.stitch]),
]

/** The pages: three rows (a light one, one with its lines, a shaded one), between the cover's row above them and its bottom strip (two
 *  rows, the outline under it) */
const PAGES = B - 5

/** The pages' edge: lines between the pages, broken here and there */
function pageLines(): Rect[] {
  const next = seeded(41)
  const rects: Rect[] = []
  for (const y of [PAGES + 1]) {
    for (let x = C + 1 + Math.floor(next() * 4); x < R - 4; x += 6 + Math.floor(next() * 8)) rects.push([x, y, Math.min(3 + Math.floor(next() * 8), R - 3 - x), 1, BOOK.pagesLine])
  }
  return rects
}

/** The pixels of the book, back to front */
export const BOOK_PIXELS: Rect[] = [
  // The spine (the back cover, seen along the left, one pixel), its top and bottom stepping in to the cover's corners
  [1, 2, 1, B - 3, BOOK.spine],
  ...spine(),
  // The front cover: its face, a light line along the top, a shade along the right and bottom, the hinge and its rivets
  [C, 1, R - C + 1, B - 1, BOOK.cover],
  [C, 1, R - C + 1, 1, BOOK.coverLight],
  [R, 1, 1, B - 1, BOOK.coverShade],
  [C, B - 1, R - C + 1, 1, BOOK.coverShade],
  [C, 1, 3, B - 1, BOOK.hinge],
  [C + 3, 2, 1, B - 3, BOOK.coverLight],
  ...rivets(),
  // The faint shapes on the cover
  ...diamonds(),
  ...grain(),
  ...scratches(),
  ...wear(),
  ...border(),
  // The bands, ending in the brass corners
  ...band(4),
  ...band(BAND_LOW),
  ...corner(2, false),
  ...corner(BAND_LOW - 4, true),
  // The picture's outline
  [BOOK_FRAME.x, BOOK_FRAME.y, BOOK_FRAME.w, BOOK_FRAME.h, BOOK.outline],
  // The pages' edge, between the cover's bottom rows
  [C, PAGES, R - C - 2, 3, BOOK.pages],
  [C, PAGES, R - C - 2, 1, BOOK.pagesLight],
  ...pageLines(),
  [C, PAGES + 2, R - C - 2, 1, BOOK.pagesShade],
  // The outline: top, right, bottom, and the spine's left with its steps
  [C, 0, BOOK_W - C, 1, BOOK.outline],
  [BOOK_W - 1, 1, 1, B, BOOK.outline],
  [C, B, BOOK_W - C, 1, BOOK.outline],
  [0, 2, 1, B - 3, BOOK.outline],
  [1, 1, 1, 1, BOOK.outline],
  [1, B - 1, 1, 1, BOOK.outline],
  // The ribbon: in the pages (a lighter fold down its left), out over the bottom of the cover, its forked tip on the bottom edge
  [14, PAGES, 6, 3, BOOK.ribbon],
  [14, PAGES, 1, 3, BOOK.ribbonFold],
  [14, B - 2, 6, 1, BOOK.ribbonLight],
  [14, B - 1, 2, 1, BOOK.ribbonTip],
  [18, B - 1, 2, 1, BOOK.ribbonTip],
  [14, B, 1, 1, BOOK.ribbonTip],
  [19, B, 1, 1, BOOK.ribbonTip],
]
