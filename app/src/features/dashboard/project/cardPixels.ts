// THE ARTICLE CARDS' PIXEL ART (ArticleCard.tsx), drawn the way the framed buttons are (styles/buttons.css): flat colours on a grid of
// art pixels (--cpx each, styles/bloodCard.css). Two looks, SKINS: `crimson` (the first design) and `gold` (the second). Their art is in
// cardPixelData.ts and goldCardData.ts, as letter grids; here: how it is put together, and where things go.
// The crimson one, how to change it:
//   - a colour: change it in PALETTE (cardPixelData.ts): every pixel of that letter changes;
//   - a pixel of the frame: change its letter in FRAME_LEFT (the right half follows: it is the left half mirrored);
//   - a gem: CORNER_GEM (the gem of both top corners' stars), TOP_GEM, BOTTOM_GEM; they are put on the frame unmirrored, at GEMS' places, each covering its
//     whole box (its '.' are see-through there);
//   - the chalice (the picture of an article without one): CHALICE and ART_PALETTE;
//   - where the picture, title and text go: LAYOUT (bloodCard.css takes them from there).
// The gold one: GOLD_FRAME (the whole frame, as drawn: not mirrored), GOLD_PALETTE, GOLD_CHALICE, GOLD_ART_PALETTE (goldCardData.ts), and
// its places in SKINS.gold below.
// Each is drawn as an SVG, one <path> per colour, made once (ArticleCard.tsx). Pure: cardPixels.test.ts.
import { ART_PALETTE, BOTTOM_GEM, CHALICE, CORNER_GEM, FRAME_LEFT, PALETTE, TOP_GEM } from './cardPixelData'
import { GOLD_ART_PALETTE, GOLD_CHALICE, GOLD_FRAME, GOLD_PALETTE } from './goldCardData'

export { ART_PALETTE, GOLD_ART_PALETTE, GOLD_PALETTE, PALETTE }

/** Sizes and places, in art pixels (x, y from the card's top left) */
export const LAYOUT = {
  /** The whole card (the frame, and the gems sticking out of it) */
  width: 184,
  height: 238,
  /** The picture: behind the frame's window (the window, and a pixel under the frame all round) */
  window: { x: 24, y: 19, width: 134, height: 122 },
  /** The title: on the plaque, inside its border */
  title: { x: 38, y: 146, width: 108, height: 24 },
  /** The text, under the plaque (three lines) */
  text: { x: 31, y: 178, width: 122, height: 40 },
} as const

/** Where the gems go: their top left corners */
export const GEMS = [
  { piece: CORNER_GEM, x: 20, y: 16 },
  { piece: CORNER_GEM, x: 153, y: 16 },
  { piece: TOP_GEM, x: 82, y: 0 },
  { piece: BOTTOM_GEM, x: 82, y: 210 },
] as const

/** A grid of letters (null: none) */
export type Canvas = (string | null)[][]

const toCanvas = (rows: readonly string[]): Canvas => rows.map((row) => [...row].map((ch) => (ch === '.' ? null : ch)))

/** Puts a letter grid on the canvas with its top left at x, y, over its whole box: its '.' are see-through (`keep`: they leave what is there) */
function stamp(canvas: Canvas, piece: readonly string[], x: number, y: number, keep = false) {
  piece.forEach((row, dy) => {
    ;[...row].forEach((ch, dx) => {
      if (canvas[y + dy]?.[x + dx] === undefined || (keep && ch === '.')) return
      canvas[y + dy][x + dx] = ch === '.' ? null : ch
    })
  })
}

/** The frame: its left half, and that half mirrored on the right; then the gems */
export function drawFrame(): Canvas {
  const canvas = toCanvas(FRAME_LEFT.map((row) => row + [...row].reverse().join('')))
  for (const { piece, x, y } of GEMS) stamp(canvas, piece, x, y)
  return canvas
}

/** The chalice */
export const drawChalice = (): Canvas => toCanvas(CHALICE)

/**
 * A canvas as SVG paths, one per letter: each run of one letter along a row is a rectangle, joined with the same run (same place, same
 * width, ending at the same letters) in the rows under it. In the palette's order, so the file reads the same every time
 */
export function toPaths(canvas: Canvas, palette: Record<string, string>): { letter: string; d: string }[] {
  const rects = new Map<string, string[]>()
  const runsOf = (row: (string | null)[]) => {
    const runs: { x: number; w: number; letter: string }[] = []
    let x = 0
    while (x < row.length) {
      const letter = row[x]
      let w = 1
      while (x + w < row.length && row[x + w] === letter) w++
      if (letter !== null) runs.push({ x, w, letter })
      x += w
    }
    return runs
  }
  const rows = canvas.map(runsOf)
  const used = rows.map((runs) => runs.map(() => false))
  rows.forEach((runs, y) => {
    runs.forEach((run, i) => {
      if (used[y][i]) return
      let h = 1
      for (;;) {
        const below = rows[y + h]?.findIndex((r) => r.x === run.x && r.w === run.w && r.letter === run.letter)
        if (below === undefined || below < 0 || used[y + h][below]) break
        used[y + h][below] = true
        h++
      }
      rects.set(run.letter, [...(rects.get(run.letter) ?? []), `M${run.x} ${y}h${run.w}v${h}h-${run.w}z`])
    })
  })
  return Object.keys(palette)
    .filter((letter) => rects.has(letter))
    .map((letter) => ({ letter, d: rects.get(letter)!.join('') }))
}

/** A canvas as an SVG file's text: square pixels, sharp at any size */
export function toSvg(canvas: Canvas, palette: Record<string, string>): string {
  const width = canvas[0].length
  const height = canvas.length
  const paths = toPaths(canvas, palette)
    .map(({ letter, d }) => `<path fill="${palette[letter]}" d="${d}"/>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" shape-rendering="crispEdges">${paths}</svg>`
}

/** A box, in art pixels */
type Box = { x: number; y: number; width: number; height: number }

/** One look of the card: its art, and where its picture, title and text go (in art pixels), and how they look */
export type Skin = {
  /** The card's size in art pixels (the frame's grid) */
  width: number
  height: number
  frame: () => Canvas
  palette: Record<string, string>
  chalice: () => Canvas
  artPalette: Record<string, string>
  /** Where the picture goes (behind the frame's window) */
  window: Box
  /** The title's box on the plaque, and the text's box under it */
  title: Box
  text: Box
  /** Type sizes in art pixels, the text's line height, and the colours (taken from the design) */
  titleSize: number
  textSize: number
  lineHeight: number
  titleColour: string
  textColour: string
  /** The ⋯ button's place (from the card's top and right) and the pin's (from its top and left), clear of the corner ornaments */
  more: { top: number; right: number }
  /** The ⋯ set into the frame instead (MoreOrnament); without it, a small dark button at `more` */
  ornament?: MoreOrnament
  pin: { top: number; left: number }
}

/**
 * The ⋯ set into the frame's top-right corner ornament: its gem taken out (`clear`'s letters inside `socket` become `recess`) and three
 * small gems set there in a row, `gap` apart, centred in the socket. It is drawn from the frame itself (the `box` cut out of it), so it is
 * part of it; the whole box is the button. `dot` is one gem as it rests, `hover` lit (also while its menu is open), `pressed` sunk (drawn
 * one pixel lower)
 */
export type MoreOrnament = {
  box: Box
  socket: Box
  clear: string
  recess: string
  gap: number
  dot: readonly string[]
  hover: readonly string[]
  pressed: readonly string[]
}

/** The crimson card's ⋯: three small rubies in the top-right star, in place of its gem */
const CRIMSON_ORNAMENT: MoreOrnament = {
  box: { x: 146, y: 5, width: 28, height: 30 },
  socket: { x: 155, y: 16, width: 11, height: 10 },
  clear: 'rgGsRPw',
  recess: 'o',
  gap: 1,
  dot: ['PGg', 'Ggr', 'grr'],
  hover: ['wPG', 'PGs', 'Gsg'],
  pressed: ['sgr', 'grr', 'rrr'],
}

/**
 * The ornament's art in one state: the frame's box with the socket emptied and the three gems set in it. `part`: 'base' the box with the
 * socket emptied (no gems), 'gems' the gems alone (a layer of their own: they glow when lit), 'all' both
 */
export function drawOrnament(frame: Canvas, o: MoreOrnament, state: 'dot' | 'hover' | 'pressed', part: 'all' | 'base' | 'gems' = 'all'): Canvas {
  const dots = part === 'gems' ? 'only' : 'with'
  const { box, socket } = o
  const out: Canvas = Array.from({ length: box.height }, (_, y) =>
    Array.from({ length: box.width }, (_, x) => {
      if (dots === 'only') return null
      const c = frame[box.y + y]?.[box.x + x] ?? null
      const inSocket = box.x + x >= socket.x && box.x + x < socket.x + socket.width && box.y + y >= socket.y && box.y + y < socket.y + socket.height
      return c !== null && inSocket && o.clear.includes(c) ? o.recess : c
    }),
  )
  const gem = o[state]
  const w = gem[0].length
  const h = gem.length
  const total = w * 3 + o.gap * 2
  const x0 = socket.x - box.x + Math.floor((socket.width - total) / 2)
  const y0 = socket.y - box.y + Math.floor((socket.height - h) / 2) + (state === 'pressed' ? 1 : 0)
  if (part !== 'base') for (let i = 0; i < 3; i++) stamp(out, gem, x0 + i * (w + o.gap), y0, true)
  return out
}

export const SKINS = {
  crimson: {
    ...LAYOUT,
    frame: drawFrame,
    palette: PALETTE,
    chalice: drawChalice,
    artPalette: ART_PALETTE,
    titleSize: 16.7,
    textSize: 11.2,
    lineHeight: 1.07,
    titleColour: '#ac6063',
    textColour: '#b8abaa',
    more: { top: 23, right: 42 },
    pin: { top: 41, left: 30 },
    ornament: CRIMSON_ORNAMENT,
  },
  gold: {
    width: 236,
    height: 306,
    frame: () => toCanvas(GOLD_FRAME),
    palette: GOLD_PALETTE,
    chalice: () => toCanvas(GOLD_CHALICE),
    artPalette: GOLD_ART_PALETTE,
    window: { x: 37, y: 27, width: 162, height: 158 },
    title: { x: 42.5, y: 189, width: 148, height: 28 },
    text: { x: 38.6, y: 228.5, width: 156, height: 48 },
    titleSize: 21.3,
    textSize: 14.6,
    lineHeight: 1.04,
    titleColour: '#8e5a5c',
    textColour: '#969393',
    more: { top: 44, right: 42 },
    pin: { top: 44, left: 44 },
  },
} satisfies Record<string, Skin>

export type SkinName = keyof typeof SKINS

/** An SVG as an address an <img> can show */
export const svgUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`
