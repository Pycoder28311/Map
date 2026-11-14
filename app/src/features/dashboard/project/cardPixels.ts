// THE ARTICLE CARD'S PIXEL ART (ArticleCard.tsx), drawn the way the framed buttons are (styles/buttons.css): flat colours on a grid of
// art pixels (--cpx each, styles/bloodCard.css). The art itself is in cardPixelData.ts, as letter grids; here: how it is put together,
// and where things go. How to change it:
//   - a colour: change it in PALETTE (cardPixelData.ts): every pixel of that letter changes;
//   - a pixel of the frame: change its letter in FRAME_LEFT (the right half follows: it is the left half mirrored);
//   - a gem: CORNER_GEM (the gem of both top corners' stars), TOP_GEM, BOTTOM_GEM; they are put on the frame unmirrored, at GEMS' places, each covering its
//     whole box (its '.' are see-through there);
//   - the chalice (the picture of an article without one): CHALICE and ART_PALETTE;
//   - where the picture, title and text go: LAYOUT (bloodCard.css takes them from there).
// Each is drawn as an SVG, one <path> per colour, made once (ArticleCard.tsx). Pure: cardPixels.test.ts.
import { ART_PALETTE, BOTTOM_GEM, CHALICE, CORNER_GEM, FRAME_LEFT, PALETTE, TOP_GEM } from './cardPixelData'

export { ART_PALETTE, PALETTE }

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

/** Puts a letter grid on the canvas with its top left at x, y, over its whole box: its '.' are see-through */
function stamp(canvas: Canvas, piece: readonly string[], x: number, y: number) {
  piece.forEach((row, dy) => {
    ;[...row].forEach((ch, dx) => {
      if (canvas[y + dy]?.[x + dx] !== undefined) canvas[y + dy][x + dx] = ch === '.' ? null : ch
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

/** An SVG as an address an <img> can show */
export const svgUrl = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`
