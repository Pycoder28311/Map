// THE ARTICLE CARD'S PIXEL ART (ArticleCard.tsx), drawn the way the framed buttons are (styles/buttons.css): flat colours on a grid of
// art pixels (--cpx: 2px each, styles/bloodCard.css). Everything here is in art pixels. How to change it:
//   - a colour: change it in PALETTE (every pixel of that letter changes);
//   - a piece (a corner star, a gem, a knot): edit its letter grid, one letter per pixel, '.' for none. Keep its rows the same length;
//   - the frame's band and the plaque's border: change their PROFILE (the colours from the outside in);
//   - where things are, or the card's size: change LAYOUT (bloodCard.css places the picture, title and text from the same numbers).
// The card is drawn as one SVG, one <path> per colour (ArticleCard.tsx). Pure: cardPixels.test.ts.

/** The colours, by letter. Taken from the design (the crimson card) */
export const PALETTE = {
  /** the outline round everything */
  o: '#0e0406',
  /** the panels' deep red-black (behind the text) */
  k: '#1e1014',
  /** the plaque's inside */
  p: '#2c1418',
  /** metal, darkest to lightest */
  d: '#43292d',
  m: '#694b49',
  M: '#876663',
  L: '#a77f77',
  H: '#d9b1ab',
  /** gem, darkest to lightest */
  r: '#400911',
  g: '#7a0d22',
  G: '#931931',
  R: '#ce7d85',
  w: '#f4a8ae',
} as const

export type Colour = keyof typeof PALETTE

/** Sizes and places, in art pixels (x, y from the card's top left) */
export const LAYOUT = {
  /** The whole card (the frame, and the ornaments sticking out of it) */
  width: 122,
  height: 178,
  /** The frame's outer edge */
  frame: { x: 3, y: 6, width: 116, height: 165 },
  /** The picture's window (see-through: the picture is behind the frame) */
  window: { x: 10, y: 13, width: 102, height: 94 },
  /** The title's plaque (its pointed ends reach onto the frame's sides) */
  plaque: { x: 6, y: 107, width: 110, height: 21 },
  /** The text, under the plaque */
  text: { x: 21, y: 131, width: 80, height: 31 },
} as const

/** The frame's band, from its outer edge in: outline, a light line, dark metal, outline, a dark groove, a thin light line, outline */
export const BAND = ['o', 'L', 'm', 'o', 'd', 'M', 'o'] as const satisfies readonly Colour[]
/** The plaque's border, from its edge in: outline, a light line, dark metal, outline, a dark line; inside it, `p` */
export const PLAQUE_BORDER = ['o', 'M', 'd', 'o', 'k'] as const satisfies readonly Colour[]

/** A corner of the frame (top left; the others are it mirrored): a round gem in a metal ring, eight spikes */
export const STAR = [
  '..........oHo..........',
  '..........oLo..........',
  '..........oLo..........',
  '....o.....oLmo....o....',
  '...oHo...ooLmo...oHo...',
  '....oLoooMMMMMoooLo....',
  '.....oLMMMoooMMMLo.....',
  '.....oMMoogggooddo.....',
  '.....oMoogggggoodo.....',
  '...ooMMogwRGgggoddo....',
  'ooommMoggRGgggggodooooo',
  'HLLLLMoggGggggrgodLLLLH',
  'oooooMoggggggrrgodmmooo',
  '....oMMoggggrrgoddoo...',
  '.....oMooggrrgoodo.....',
  '.....oMdoogggooddo.....',
  '.....oLdddooodddLo.....',
  '....oLooodddddoooLo....',
  '...oHo...omLoo...oHo...',
  '....o....omLo.....o....',
  '..........oLo..........',
  '..........oLo..........',
  '..........oHo..........',
]

/** The gem in the middle of the frame's top edge */
export const TOP_GEM = [
  '.........oLo.........',
  '.........oLo.........',
  '........oLLMo........',
  '........oLoMo........',
  '.......oLogoMo.......',
  '.o....oLLogoMMo....o.',
  'oLo...oLowggoMo...oMo',
  '.oLo.oLoGRRggoMo.oMo.',
  '..oLoLLoRGgggoMMoMo..',
  '...oLLoGGGggggoMMo...',
  '...oLoGGGGgggggoMo...',
  '....oLoGGGggggoMo....',
  '....oLLoGGgrgoMMo....',
  '.....oLoGGgrgoMo.....',
  '......oLoGrgoMo......',
  '......oLLogoMMo......',
  '.......oLogoMo.......',
  '........oLoMo........',
  '........oLLMo........',
  '.........oLo.........',
  '.........oLo.........',
]

/** The gem in the middle of the frame's bottom edge */
export const BOTTOM_GEM = [
  '......oLo......',
  '......oLo......',
  '.....oLoMo.....',
  '....oLogoMo....',
  '...oLLwgoMMo...',
  '..oLLoRggoMMo..',
  '.oLLoRGgggoMMo.',
  'oLLoGGGggggoMMo',
  '.oLLoGGgggoMMo.',
  '..oLLoGgroMMo..',
  '...oLLoroMMo...',
  '....oLogoMo....',
  '.....oLoMo.....',
  '......oLo......',
  '......oLo......',
]

/** The knot in each bottom corner, inside the frame */
export const KNOT = [
  '...ooooo...',
  '..oMMMMMo..',
  '.oMMoooMdo.',
  'oMMookooddo',
  'oMookLkoodo',
  'oMokLHLkodo',
  'oMookLkoodo',
  'oMMookooddo',
  '.oddoooddo.',
  '..odddddo..',
  '...ooooo...',
]

/** The small studs on the plaque's top and bottom edges, and the dark crosses near its ends */
export const STUD = ['.o.', 'oLo', '.o.']
export const CROSS = ['.g.', 'ggg', '.g.']

/** A grid of colours (null: none), as wide and tall as the card */
type Canvas = (Colour | null)[][]

const blank = (): Canvas => Array.from({ length: LAYOUT.height }, () => Array<Colour | null>(LAYOUT.width).fill(null))

/** Puts a letter grid on the canvas with its top left at x, y (mirrored left to right with `flip`); its '.' leave what is there */
function stamp(canvas: Canvas, piece: readonly string[], x: number, y: number, flip = false) {
  piece.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const ch = row[flip ? row.length - 1 - dx : dx]
      const cy = Math.floor(y) + dy
      const cx = Math.floor(x) + dx
      if (ch !== '.' && canvas[cy]?.[cx] !== undefined) canvas[cy][cx] = ch as Colour
    }
  })
}

/** Fills a rectangle (null: makes it see-through) */
function fill(canvas: Canvas, { x, y, width, height }: { x: number; y: number; width: number; height: number }, colour: Colour | null) {
  for (let cy = y; cy < y + height; cy++) for (let cx = x; cx < x + width; cx++) canvas[cy][cx] = colour
}

/** The frame: its band (BAND, from each edge in, meeting at the corners) round a `k` inside */
function drawFrame(canvas: Canvas) {
  const { x, y, width, height } = LAYOUT.frame
  for (let cy = y; cy < y + height; cy++) {
    for (let cx = x; cx < x + width; cx++) {
      const depth = Math.min(cx - x, x + width - 1 - cx, cy - y, y + height - 1 - cy)
      canvas[cy][cx] = depth < BAND.length ? BAND[depth] : 'k'
    }
  }
}

/** The plaque: straight along its top and bottom, its ends pointed (45°); PLAQUE_BORDER from its edge in, `p` inside */
function drawPlaque(canvas: Canvas) {
  const { x, y, width, height } = LAYOUT.plaque
  const mid = (height - 1) / 2
  for (let row = 0; row < height; row++) {
    // how far in each end starts on this row: 0 on the middle row, more towards the top and bottom
    const inset = Math.round(Math.abs(row - mid))
    for (let cx = x + inset; cx < x + width - inset; cx++) {
      const fromEnd = Math.min(cx - x - inset, x + width - 1 - inset - cx)
      const depth = Math.min(row, height - 1 - row, fromEnd)
      canvas[y + row][cx] = depth < PLAQUE_BORDER.length ? PLAQUE_BORDER[depth] : 'p'
    }
  }
  const centre = x + (width - STUD[0].length) / 2
  stamp(canvas, STUD, centre, y - 1)
  stamp(canvas, STUD, centre, y + height - 2)
  stamp(canvas, CROSS, x + 9, y + mid - 1)
  stamp(canvas, CROSS, x + width - 12, y + mid - 1)
}

/** The whole card, as a grid of colours: the frame, the see-through window, the plaque and the ornaments */
export function drawCard(): Canvas {
  const canvas = blank()
  drawFrame(canvas)
  fill(canvas, LAYOUT.window, null)
  drawPlaque(canvas)
  const { frame } = LAYOUT
  const right = LAYOUT.width - STAR[0].length
  stamp(canvas, STAR, 0, frame.y - 1)
  stamp(canvas, STAR, right, frame.y - 1, true)
  stamp(canvas, TOP_GEM, (LAYOUT.width - TOP_GEM[0].length) / 2, 0)
  stamp(canvas, BOTTOM_GEM, (LAYOUT.width - BOTTOM_GEM[0].length) / 2, frame.y + frame.height - 9)
  stamp(canvas, KNOT, frame.x + 2, frame.y + frame.height - KNOT.length - 2)
  stamp(canvas, KNOT, frame.x + frame.width - KNOT[0].length - 2, frame.y + frame.height - KNOT.length - 2, true)
  return canvas
}

/**
 * A canvas as SVG paths, one per colour: each run of one colour along a row is a rectangle, joined with the same run in the rows under it.
 * In PALETTE's order, so the file reads the same every time
 */
export function toPaths(canvas: Canvas): { colour: Colour; d: string }[] {
  const rects = new Map<Colour, string[]>()
  const done = canvas.map((row) => row.map(() => false))
  canvas.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const colour = row[x]
      if (colour === null || done[y][x]) {
        x++
        continue
      }
      let w = 1
      while (x + w < row.length && row[x + w] === colour && !done[y][x + w]) w++
      let h = 1
      while (y + h < canvas.length && canvas[y + h].slice(x, x + w).every((c, i) => c === colour && !done[y + h][x + i]) && (canvas[y + h][x - 1] !== colour || x === 0) && canvas[y + h][x + w] !== colour) h++
      for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) done[y + dy][x + dx] = true
      rects.set(colour, [...(rects.get(colour) ?? []), `M${x} ${y}h${w}v${h}h-${w}z`])
      x += w
    }
  })
  return (Object.keys(PALETTE) as Colour[]).filter((c) => rects.has(c)).map((colour) => ({ colour, d: rects.get(colour)!.join('') }))
}
