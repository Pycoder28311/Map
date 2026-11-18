import type { CSSProperties } from 'react'

// An article's Dashboard card drawn as a pixel-art book (BookArt.tsx draws it from the pixels here) (a closed tome seen from the front, its spine on the left, its pages and a ribbon
// bookmark along the bottom): the pixels below are the book, on a grid of BOOK_GRID × BOOK_GRID pixels that fills the card (a 192px card: one
// pixel of the drawing is 4px). The card's content (its picture, title, preview and date) is laid on its cover by cardFaces.tsx, placed on
// the same grid with `bookAt`, so it lines up with the drawing.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const BOOK = {
  /** The hard outline round everything */
  outline: '#2b2840',
  /** The back cover, seen along the left */
  spine: '#461641',
  /** The ridges across the spine */
  ridge: '#8a2470',
  /** The front cover */
  cover: '#6b215f',
  /** The hinge, where the cover meets the spine */
  hinge: '#561a4f',
  /** The bands across the top and bottom of the cover */
  band: '#c92f7f',
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
  ink: '#f6d3e6',
  inkFaint: '#d995bd',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Pixels across (and down) the drawing */
export const BOOK_GRID = 48

/** Where something on the cover goes, in pixels of the drawing (from the top left): its absolute position as percentages of the card */
export function bookAt(x: number, y: number, w: number, h: number): CSSProperties {
  const pct = (n: number) => `${(n / BOOK_GRID) * 100}%`
  return { position: 'absolute', left: pct(x), top: pct(y), width: pct(w), height: pct(h) }
}

/** The picture's frame on the cover (its outline: the picture fills it less one pixel each side), and the line its title sits on */
export const BOOK_FRAME = { x: 8, y: 5, w: 35, h: 17 } as const
/** The preview and date, under the title, between the frame and the bottom band */
export const BOOK_TEXT = { x: 8, y: 25, w: 33, h: 9 } as const

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** The dashes of a band across the cover, from x to the gold corner, `h` pixels tall */
const band = (y: number, h: number): Rect[] => [7, 13, 19, 25, 31, 37].map((x) => [x, y, 5, h, BOOK.band])

/** The pixels of the book, back to front */
export const BOOK_PIXELS: Rect[] = [
  // The spine (the back cover, seen along the left), its top and bottom stepping in to the cover's corners
  [1, 3, 1, 39, BOOK.spine],
  [2, 2, 2, 41, BOOK.spine],
  [1, 6, 3, 1, BOOK.ridge],
  [1, 38, 3, 1, BOOK.ridge],
  // The front cover and its hinge
  [4, 1, 43, 43, BOOK.cover],
  [4, 1, 2, 43, BOOK.hinge],
  // The bands, ending in the gold corners
  ...band(2, 2),
  ...band(34, 2),
  // The gold corners: an L each, the top right one at the top, the bottom right one at the bottom
  [42, 2, 4, 1, BOOK.gold],
  [45, 2, 1, 4, BOOK.gold],
  [45, 2, 1, 1, BOOK.goldDeep],
  [44, 3, 1, 1, BOOK.goldDeep],
  [42, 35, 4, 1, BOOK.gold],
  [45, 32, 1, 4, BOOK.gold],
  [45, 35, 1, 1, BOOK.goldDeep],
  [44, 34, 1, 1, BOOK.goldDeep],
  // The pages' edge, between the cover's bottom rows
  [4, 37, 41, 3, BOOK.pages],
  [4, 37, 41, 1, BOOK.pagesLight],
  [4, 40, 41, 1, BOOK.pagesShade],
  // The picture's frame
  [BOOK_FRAME.x, BOOK_FRAME.y, BOOK_FRAME.w, BOOK_FRAME.h, BOOK.outline],
  // The outline: top, right, bottom, and the spine's left with its steps
  [4, 0, 44, 1, BOOK.outline],
  [47, 1, 1, 43, BOOK.outline],
  [4, 44, 44, 1, BOOK.outline],
  [0, 3, 1, 39, BOOK.outline],
  [1, 2, 1, 1, BOOK.outline],
  [2, 1, 2, 1, BOOK.outline],
  [1, 42, 1, 1, BOOK.outline],
  [2, 43, 2, 1, BOOK.outline],
  // The ribbon: in the pages, out over the bottom edge, its forked tip hanging below
  [9, 37, 5, 5, BOOK.ribbon],
  [9, 42, 5, 3, BOOK.ribbonLight],
  [9, 45, 5, 1, BOOK.ribbonTip],
  [9, 46, 2, 1, BOOK.ribbonTip],
  [12, 46, 2, 1, BOOK.ribbonTip],
  [9, 47, 1, 1, BOOK.ribbonTip],
  [13, 47, 1, 1, BOOK.ribbonTip],
]
