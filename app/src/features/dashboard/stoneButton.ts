// The Dashboard's big Create button in pixel art (BigCreateButton.tsx): a pale stone slab, like an old game's menu button, its edges copied
// from the reference: a light rim round the face's top and left, bevels and the slab's dark thickness down and to the right of it, a
// shadow beside and under that, every corner stepped. In two parts, so the face can sink when pressed: FACE (the face and its rim) and
// BASE (the bevels, the thickness, the shadow). STONE_W × STONE_H pixels of STONE_PIXEL px each: the size of the
// Dashboard's other pixel art (cards/book.ts).

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const STONE = {
  /** The light rim along the top and left */
  rim: '#bdb6a2',
  face: '#a89f8d',
  /** The edge down the right and the first bevel row, and the darker second one */
  bevel: '#8a7b70',
  bevelDark: '#685552',
  /** The slab's thickness, and its lowest row */
  depth: '#453636',
  depthLow: '#36282c',
  shadow: 'rgb(12 8 10 / 0.5)',
  /** The word on it */
  ink: '#2a1f22',
} as const
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
/** The drawing's size in pixels: wider than the reference (room for its word), and as many middle rows as keep its proportions */
export const STONE_W = 110
export const STONE_H = 40
/** The rows down to the face's bottom bevel: its word is centred on them */
export const STONE_FACE_ROWS = STONE_H - 7
/** How far (pixels) the face sinks while pressed */
export const STONE_PRESS = 2

type Rect = [x: number, y: number, w: number, h: number, fill: string]

const COLOUR: Record<string, string> = { R: STONE.rim, F: STONE.face, b: STONE.bevel, B: STONE.bevelDark, D: STONE.depth, d: STONE.depthLow, S: STONE.shadow }
/** What moves when pressed (the face and its rim); the rest stays (the bevels, the thickness, the shadow) */
const ON_FACE = new Set(['R', 'F'])

/** Every row of the drawing as a string of STONE_W letters */
const ROWS: string[] = [...TOP, ...Array.from({ length: STONE_H - TOP.length - BOTTOM.length }, () => MIDDLE), ...BOTTOM].map(([left, right]) =>
  left + left[left.length - 1].repeat(STONE_W - left.length - right.length) + right,
)

/** The pixels of the letters `keep` picks, a rectangle per run of one letter along a row */
function pixels(keep: (letter: string) => boolean): Rect[] {
  const rects: Rect[] = []
  ROWS.forEach((line, y) => {
    for (let x = 0; x < line.length; ) {
      const letter = line[x]
      let end = x
      while (end + 1 < line.length && line[end + 1] === letter) end++
      if (letter !== '.' && keep(letter)) rects.push([x, y, end - x + 1, 1, COLOUR[letter]])
      x = end + 1
    }
  })
  return rects
}

/** The face and its rim (they sink when pressed) */
export const STONE_FACE: Rect[] = pixels((l) => ON_FACE.has(l))
/** The bevels, the thickness and the shadow */
export const STONE_BASE: Rect[] = pixels((l) => !ON_FACE.has(l))
