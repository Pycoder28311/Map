import type { CSSProperties } from 'react'

// An article's Dashboard card drawn as a pixel-art book (BookArt.tsx draws it from the pixels here): a closed grey tome seen from the front,
// its spine along the left, banded cover with gold corners, its pages and a ribbon bookmark along the bottom. The book fills the card's box
// (the same square as every card), on a grid of BOOK_GRID × BOOK_GRID pixels: one pixel of the drawing is BOOK_PIXEL px on screen, the same
// size as the Dashboard's other pixel art (DashboardRelics: SCALE). The card's content (its picture, title, preview and date) is laid on the
// cover by cardFaces.tsx, placed on the same grid with `bookAt`, so it lines up with the drawing.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BOOK = {
  /** The hard outline round everything */
  outline: '#111317',
  /** The back cover, seen along the left, and the ridges across it */
  spine: '#23272e',
  ridge: '#4c5460',
  /** The front cover: its face, the light line along its top and the shade along its right and bottom */
  cover: '#343a43',
  coverLight: '#464d58',
  coverShade: '#2a2f37',
  /** The cover's grain: faint streaks a little darker and a little lighter than it */
  grainDark: '#2d323a',
  grainLight: '#3b424c',
  /** The hinge, where the cover meets the spine */
  hinge: '#272b33',
  /** The bands' dashes (light top, face, shaded bottom) and the groove they sit in */
  band: '#7f8995',
  bandLight: '#aab3bf',
  bandShade: '#59626e',
  groove: '#22262d',
  /** The metal corners */
  gold: '#ffd43b',
  goldDeep: '#f7931e',
  /** The pages' edge, its light line on top and its shaded line below */
  pages: '#fbb07a',
  pagesLight: '#fdd0a2',
  pagesShade: '#dfa398',
  /** The ribbon: in the book, out of it, and its forked tip */
  ribbon: '#b0303f',
  ribbonLight: '#e5463a',
  ribbonTip: '#f5822a',
  /** The text on the cover */
  ink: '#eef1f5',
  inkFaint: '#c3cad4',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down) the drawing: the 192px card at BOOK_PIXEL px a pixel */
export const BOOK_GRID = 64
/** One pixel of the drawing on screen (px): the Dashboard's pixel art's size (DashboardRelics) */
export const BOOK_PIXEL = 3

/** Where something on the cover goes, in pixels of the drawing (from the top left): its absolute position as percentages of the card */
export function bookAt(x: number, y: number, w: number, h: number): CSSProperties {
  const pct = (n: number) => `${(n / BOOK_GRID) * 100}%`
  return { position: 'absolute', left: pct(x), top: pct(y), width: pct(w), height: pct(h) }
}

/** The picture's frame on the cover (its outline: the picture fills it less one pixel each side); the title sits on its bottom edge */
export const BOOK_FRAME = { x: 8, y: 7, w: 51, h: 26 } as const
/** The preview and date, under the title, above the bottom band */
export const BOOK_TEXT = { x: 8, y: 36, w: 48, h: 12 } as const

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** Where the bands' dashes start (each DASH wide), between the hinge and the gold corner */
const DASHES = [8, 18, 28, 38, 48]
const DASH = 8

/** A band across the cover at `y`: a groove three pixels tall, and dashes in it, each with a light top, a shaded bottom and cut corners */
const band = (y: number): Rect[] => [
  [7, y + 1, 49, 1, BOOK.groove],
  ...DASHES.flatMap((x): Rect[] => [
    [x + 1, y, DASH - 2, 1, BOOK.bandLight],
    [x, y + 1, DASH, 1, BOOK.band],
    [x + 1, y + 2, DASH - 2, 1, BOOK.bandShade],
    // a glint on its left end
    [x + 1, y + 1, 1, 1, BOOK.bandLight],
  ]),
]

/** A gold corner: an L two pixels thick along the top (or bottom) and the right, six tall, a darker tip and inner corner */
const corner = (y: number, down: boolean): Rect[] => {
  const edge = down ? y + 4 : y
  return [
    [56, edge, 5, 2, BOOK.gold],
    [59, y, 2, 6, BOOK.gold],
    [60, down ? edge + 1 : edge, 1, 1, BOOK.goldDeep],
    [58, down ? edge - 1 : edge + 2, 1, 1, BOOK.goldDeep],
  ]
}

/** The cover's grain, like worn leather: short faint streaks across it, scattered the same way on every book (a fixed seed) */
function grain(): Rect[] {
  let seed = 7
  const next = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
  const rects: Rect[] = []
  for (let y = 2; y < 62; y += 2) {
    // a few streaks on each other row, each 2–6 pixels long, a step off the row now and then
    for (let x = 8 + Math.floor(next() * 6); x < 60; x += 5 + Math.floor(next() * 9)) {
      const length = Math.min(2 + Math.floor(next() * 5), 61 - x)
      rects.push([x, y + (next() < 0.3 ? 1 : 0), length, 1, next() < 0.6 ? BOOK.grainDark : BOOK.grainLight])
    }
  }
  return rects
}

/** The pixels of the book, back to front */
export const BOOK_PIXELS: Rect[] = [
  // The spine (the back cover, seen along the left), its top and bottom stepping in to the cover's corners, and its ridges
  [1, 3, 1, 58, BOOK.spine],
  [2, 2, 2, 60, BOOK.spine],
  [1, 7, 3, 1, BOOK.ridge],
  [1, 56, 3, 1, BOOK.ridge],
  // The front cover: its face, a light line along the top, a shade along the right and bottom, and the hinge
  [4, 1, 59, 62, BOOK.cover],
  [4, 1, 59, 1, BOOK.coverLight],
  [62, 1, 1, 62, BOOK.coverShade],
  [4, 62, 59, 1, BOOK.coverShade],
  [4, 1, 3, 62, BOOK.hinge],
  [7, 2, 1, 60, BOOK.coverLight],
  ...grain(),
  // The bands, ending in the gold corners
  ...band(3),
  ...band(49),
  ...corner(3, false),
  ...corner(46, true),
  // The pages' edge, between the cover's bottom rows
  [4, 54, 56, 5, BOOK.pages],
  [4, 54, 56, 1, BOOK.pagesLight],
  [4, 58, 56, 1, BOOK.pagesShade],
  // The picture's frame
  [BOOK_FRAME.x, BOOK_FRAME.y, BOOK_FRAME.w, BOOK_FRAME.h, BOOK.outline],
  // The outline: top, right, bottom, and the spine's left with its steps
  [4, 0, 60, 1, BOOK.outline],
  [63, 1, 1, 63, BOOK.outline],
  [4, 63, 60, 1, BOOK.outline],
  [0, 3, 1, 58, BOOK.outline],
  [1, 2, 1, 1, BOOK.outline],
  [2, 1, 2, 1, BOOK.outline],
  [1, 61, 1, 1, BOOK.outline],
  [2, 62, 2, 1, BOOK.outline],
  // The ribbon: in the pages, out over the bottom of the cover, its forked tip on the bottom edge
  [12, 54, 6, 5, BOOK.ribbon],
  [12, 59, 6, 2, BOOK.ribbonLight],
  [12, 61, 6, 1, BOOK.ribbonTip],
  [12, 62, 2, 1, BOOK.ribbonTip],
  [16, 62, 2, 1, BOOK.ribbonTip],
  [12, 63, 1, 1, BOOK.ribbonTip],
  [17, 63, 1, 1, BOOK.ribbonTip],
]
