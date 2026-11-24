// The Dashboard's big Create button in pixel art (BigCreateButton.tsx): a pale stone slab, like an old game's menu button, its edges copied
// from the reference: a light rim round the face's top and left, bevels and the slab's dark thickness down and to the right of it, a
// shadow beside and under that, every corner stepped. In two parts, so the face can sink when pressed: FACE (the face and its rim) and
// BASE (the bevels, the thickness, the shadow). its width × height in pixels of STONE_PIXEL px each: the size of the
// Dashboard's other pixel art (cards/book.ts).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A slab's colours: its rim, face, bevels, thickness, shadow, and the word on it */
export type StonePalette = {
  rim: string
  face: string
  bevel: string
  bevelDark: string
  depth: string
  depthLow: string
  shadow: string
  ink: string
  /** Metal: the face shaded in bands, lighter at the top and darker at the bottom, a highlight row under the top rim, worn specks, and the
   *  colours of the engraved lines (a frame round its drawing; the light under its words) */
  metal?: { top: string; bottom: string; highlight: string; wear: string; engrave: string; emboss: string }
}

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

/** Gold stone, the floating Create button's gold (styles/buttons.css: --color-gold, --color-gold-dark): the Dashboard's Create buttons */
export const STONE_GOLD: StonePalette = {
  rim: '#f6d580',
  face: '#e8b84a',
  bevel: '#c4912f',
  bevelDark: '#9a6f22',
  depth: '#5c4014',
  depthLow: '#45300e',
  shadow: 'rgb(14 9 3 / 0.5)',
  ink: '#3a260c',
  metal: { top: '#ecc160', bottom: '#dcac44', highlight: '#fbe7a6', wear: '#b98c36', engrave: '#8a6420', emboss: '#f6dc96' },
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
  const face = pixels(rows, palette, (l) => ON_FACE.has(l))
  return { face: palette.metal ? metalFace(face, rows, palette) : face, base: pixels(rows, palette, (l) => !ON_FACE.has(l)) }
}

/** A metal face: its face pixels in three bands (the top fifth lighter, the bottom third darker), a highlight row under the top rim, and
 *  a few worn specks (always the same: from their place) */
function metalFace(face: Rect[], rows: string[], palette: StonePalette): Rect[] {
  const metal = palette.metal!
  const faceRows = rows.length - STONE_BELOW_FACE
  const top = Math.round(faceRows * 0.2)
  const bottom = Math.round(faceRows * 0.62)
  const speck = (x: number, y: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  const out: Rect[] = []
  for (const [x, y, w, h, fill] of face) {
    if (fill !== palette.face) {
      out.push([x, y, w, h, fill])
      continue
    }
    const band = y === 3 ? metal.highlight : y < top ? metal.top : y >= bottom ? metal.bottom : palette.face
    out.push([x, y, w, h, band])
    for (let i = x; i < x + w; i++) if (y > 3 && speck(i, y) < 0.03) out.push([i, y, 1, 1, metal.wear])
  }
  return out
}
