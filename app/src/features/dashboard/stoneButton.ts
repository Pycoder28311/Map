// The Dashboard's big Create button in pixel art (BigCreateButton.tsx): a pale stone slab, like an old game's menu button, its edges copied
// from the reference: a light rim round the face's top and left, bevels and the slab's dark thickness down and to the right of it, a
// shadow beside and under that, every corner stepped. In two parts, so the face can sink when pressed: FACE (the face and its rim) and
// BASE (the bevels, the thickness, the shadow). its width × height in pixels of STONE_PIXEL px each: the size of the
// Dashboard's other pixel art (cards/book.ts).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A slab's colours: its rim, face, bevels, thickness, shadow, and the word on it */
export type StonePalette = { rim: string; face: string; bevel: string; bevelDark: string; depth: string; depthLow: string; shadow: string; ink: string }

/** The reference's pale stone */
export const STONE: StonePalette = {
  rim: '#bdb6a2',
  face: '#a89f8d',
  bevel: '#8a7b70',
  bevelDark: '#685552',
  depth: '#453636',
  depthLow: '#36282c',
  shadow: 'rgb(12 8 10 / 0.5)',
  ink: '#2a1f22',
}

/** Green stone, the face the Create map button's grass (mapFace.ts), so both Create buttons are the same green */
export const STONE_GREEN: StonePalette = {
  rim: '#c4de98',
  face: '#a8c872',
  bevel: '#64874c',
  bevelDark: '#4a683b',
  depth: '#2f4429',
  depthLow: '#23341f',
  shadow: 'rgb(8 12 6 / 0.5)',
  ink: '#16220f',
}
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const STONE_PIXEL = 3

// The slab's edges, copied pixel for pixel from the reference button: each row's left 12 and right 10 pixels, the middle of the row
// repeating the colour they meet at. R the rim, F the face, b the bevel, B its darker row, D the thickness, d its lowest row, S the shadow,
// . nothing. The thickness sits down and to the right of the face (it shows down the right side too, with the shadow beside it).
const TOP: [left: string, right: string][] = [
  ['....RRRRRRRR', 'RRR.......'],
  ['..RRRRRRRRRR', 'RRRRR.....'],
  ['..RRRRRRRRRR', 'RRRRR.....'],
  ['.RRRRFFFFFFF', 'FFFRRR....'],
  ['.RRFFFFFFFFF', 'FFFFFR....'],
  ['RRRFFFFFFFFF', 'FFFFFFb...'],
]
/** The face's middle rows: as many as the height needs */
const MIDDLE: [left: string, right: string] = ['RRFFFFFFFFFF', 'FFFFFbBSS.']
const BOTTOM: [left: string, right: string][] = [
  ['RRFFFFFFFFFF', 'FFFFbbBSS.'],
  ['bRRFFFFFFFFF', 'FFFFbBdSS.'],
  ['bRRFFFFFFFFF', 'FFbbbBdSS.'],
  ['bRRFFFFFFFFF', 'FFbbbBdSS.'],
  ['bBRRFbbbbbbb', 'bbbBBDdSS.'],
  ['bBBBBBBBBBBB', 'BBBDDddSS.'],
  ['.BBDDDDDDDDD', 'DDDDddSSS.'],
  ['..BBDDDDDDDD', 'DDdddSSS..'],
  ['....BDdddddd', 'dddSSSSS..'],
  ['......SSSSSS', 'SSSSSSS...'],
  ['.......SSSSS', 'SSSSS.....'],
]
/** The rows under the face (its bevels, the thickness, the shadow): its word is centred on the rows above them */
export const STONE_BELOW_FACE = 7
/** How far (pixels) the face sinks while pressed */
export const STONE_PRESS = 2

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** What moves when pressed (the face and its rim); the rest stays (the bevels, the thickness, the shadow) */
const ON_FACE = new Set(['R', 'F'])

/** Every row of a slab `width` × `height` pixels, as a string of letters (the middle rows repeat as many times as the height needs) */
function rowsOf(width: number, height: number): string[] {
  return [...TOP, ...Array.from({ length: height - TOP.length - BOTTOM.length }, () => MIDDLE), ...BOTTOM].map(([left, right]) =>
    left + left[left.length - 1].repeat(width - left.length - right.length) + right,
  )
}

/** The pixels of the letters `keep` picks, a rectangle per run of one letter along a row, in `palette`'s colours */
function pixels(rows: string[], palette: StonePalette, keep: (letter: string) => boolean): Rect[] {
  const colour: Record<string, string> = { R: palette.rim, F: palette.face, b: palette.bevel, B: palette.bevelDark, D: palette.depth, d: palette.depthLow, S: palette.shadow }
  const rects: Rect[] = []
  rows.forEach((line, y) => {
    for (let x = 0; x < line.length; ) {
      const letter = line[x]
      let end = x
      while (end + 1 < line.length && line[end + 1] === letter) end++
      if (letter !== '.' && keep(letter)) rects.push([x, y, end - x + 1, 1, colour[letter]])
      x = end + 1
    }
  })
  return rects
}

/** A slab `width` × `height` pixels in `palette`: its face and rim (they sink when pressed), and its base (the bevels, the thickness, the shadow) */
export function stonePixels(width: number, height: number, palette: StonePalette): { face: Rect[]; base: Rect[] } {
  const rows = rowsOf(width, height)
  return { face: pixels(rows, palette, (l) => ON_FACE.has(l)), base: pixels(rows, palette, (l) => !ON_FACE.has(l)) }
}
