// Where the desk objects go in the navbar's pixel strip (DeskStrip.tsx), for a strip `cols` × `rows` pixels. Pure and deterministic
// (deskLayout.test.ts): the three objects are spread over the strip's width, the stars do not move when it grows.

/** The tones of a sprite's pixels: `k` is the faint ink, `w` an even fainter fill (DeskStrip.tsx, --desk-color and --desk-soft in tokens.css) */
export const TONES = { k: 'ink', w: 'soft' } as const
export type Tone = (typeof TONES)[keyof typeof TONES]

/** Things to create with, each a sprite of pixels (the `.` is empty): a compass, a protractor, a pencil */
export const SPRITES: string[][] = [
  ['.......kkk.......', '.......k.k.......', '.......kkk.......', '.....kkkkkkk.....', '...kkkwwkwwkkk...', '..kkwwwwwwwwwkk..', '.kkwwwwwwwwwwwkk.', '.kwwwwwwwwwkwwwk.', 'kkwwwwwwwwkkwwwkk', 'kwwwwwwwwkkwwwwwk', 'kwwwwwwwkkkwwwwwk', 'kkwwwwwwkkwwwwwkk', 'kwwwwwwkkwwwwwwwk', 'kwwwwwkkwwwwwwwwk', 'kkwwwwkwwwwwwwwkk', '.kwwwkwwwwwwwwwk.', '.kkwwwwwwwwwwwkk.', '..kkwwwwwwwwwkk..', '...kkkwwkwwkkk...', '.....kkkkkkk.....'],
  ['........kkkkkkk........', '......kkkkwkwkkkk......', '....kkkwkkwkwkkwkkk....', '...kkkkkkwkkkwkwkkkk...', '..kkwkkkwwwkwwwkkkwkk..', '..kkkwwkkwwwwwkkwwkkk..', '.kkkkwwwwwwwwwwwwwkkkk.', '.kwkkkwwwwwwwwwwwkkkwk.', 'kkkkwkwwwwwwwwwwwkwkkkk', 'kkkwwwwwwwwwwwwwwwwwkkk', 'kwwkwwwwwwwwwwwwwwwkwwk', 'kkkkkkkkkkkkkkkkkkkkkkk', 'kwwwwwwwwwwkwwwwwwwwwwk', 'kkkkkkkkkkkkkkkkkkkkkkk'],
  ['................kkkkk...', '................kwwwk...', '...............kwwwk....', '..............kwwwk.....', '.............kwwwk......', '............kwwwk.......', '...........kkkkk........', '..........kwwwk.........', '.........kwwwk..........', '........kwwwk...........', '.......kwwwk............', '......kwwwk.............', '.....kwwwk..............', '....kwwwk...............', '....kwk.................', '....kk..................', '...k....................'],
]

/** More things to create with, for the right side of the navbar: a book, a map, dividers and a potion */
export const RIGHT_SPRITES: string[][] = [
  ['.kkkkkkkkkkkkkkkk.', 'kwwwwwwwwwwwwwwwwk', 'kwkwwwwwwwwwwwwwwk', 'kwkwkkkkkkkkkkkwwk', 'kwkwkkkkkkkkkkkwwk', 'kwkwkkkkkkkkkkkwwk', 'kwkwwwwwwwwwwwwwwk', 'kwkwwwwkkkkwwwwwwk', 'kwkwwwwkkkkwwwwwwk', 'kwkwwwwwwwwwwwwwwk', 'kwkwwwwwwwwwwwwwwk', 'kwwwwwwwwwwwwwwwwk', '.kkkkkkkkkkkkkkkk.', '.kwwwwwwwwwwwwwwk.', '..kkkkkkkkkkkkkk..'],
  ['kkkkkkkkkkkkkkkkkkkkkkkk', 'kwwwwwwwkwwwwwwwkwwwwwwk', 'kwww.wwwwwwwwwwwwww...wk', 'kww...wwkwwwwwwwkw.....k', 'kw.....wwwwwwwwwww.....k', 'kw.....wkwwwwkwwkk.....k', 'kw.....wwwwkwwwkwww...wk', 'kww...wwkkwwwwwwkwwwkwkk', 'kwww.wwkwww...wwwwwwwkwk', 'kwwkwwwwkw.....wkwwwkwkk', 'kwwwwkwww.......wwkkkwwk', 'kwwwwkwwkw.....wkkkkkkwk', 'kwwwkkkwwww...wwwwkkkwwk', 'kwwwwkwwkwwwwwwwkwwwwwwk', 'kwwwwwwwwwwwwwwwwwwwwwwk', 'kkkkkkkkkkkkkkkkkkkkkkkk'],
  ['......kkkkk......', '......k...k......', '......k...k......', '......kkkkk......', '........k........', '........k........', '.......kkk.......', '......kk.kk......', '......kk.kk......', '.....kk...kk.....', '.....kk...kk.....', '....kkwwkwwkk....', '...kk.......kk...', '...kk.......kk...', '..kk.........kk..', '..kk.........kk..', '.kk...........kk.', 'kk.............kk', 'kk.............kk', 'kk.............kk'],
  ['.......kkk.......', '.......kkk.......', '.....kkkkkkk.....', '......k...k......', '......k...k......', '......k...k......', '......kwwwk......', '....kk....kkk....', '...kk.....w.kk...', '...k....w....k...', '..kk.........kk..', '..kwwwwwwwwwwwk..', '..kwww.wwwwwwwk..', '..kww.wwwwwwwwk..', '..kkw.wwwwwwwkk..', '...kwwwwwwwwwk...', '...kkwwwwwwwkk...', '....kkkwwwkkk....', '......kkkkk......'],
]

/** A pixel of the strip */
export type Pixel = { x: number; y: number }
/** The pixels of the desk objects, by tone, and the little stars between them */
/** One desk object: its pixels by tone and how far it is turned (degrees) */
export type DeskObject = Record<Tone, Pixel[]> & { angle: number }
export type Desk = { objects: DeskObject[]; stars: Pixel[] }

/** The turn of each object: a little, to either side (degrees) */
const TURN = { min: 4, max: 9 }


/** A fast seeded random generator (mulberry32): the same seed always gives the same numbers */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** STARS (1 of 2): how dense the stars are: the chance of a star in each column of the strip (0: none, 0.12: a few, 0.3: many); a little cross of five is a tenth as likely */
export const STAR_DENSITY = 0.08
/** STARS (2 of 2): the stars' colour (any CSS colour; a gold, still faint, by default) */
export const STAR_COLOUR = 'color-mix(in srgb, #f2c230 60%, transparent)'
const STAR = STAR_DENSITY
const CROSS = STAR_DENSITY / 10

export function deskLayout(cols: number, rows: number, seed = 11, sprites: string[][] = SPRITES): Desk {
  const desk: Desk = { objects: [], stars: [] }

  // The objects (the three of the left side, or the right side's), spread evenly along the strip, each at a height of its own and some turned around
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = []
  const next = random(seed)
  sprites.forEach((sprite, n) => {
    const flip = next() < 0.5
    const height = sprite.length
    const width = sprite[0].length
    const x = Math.max(0, Math.floor(((n + 0.5) * cols) / sprites.length - width / 2))
    const y = rows > height ? Math.floor(next() * (rows - height)) : 0
    const object: DeskObject = {
      ink: [],
      soft: [],
      angle: (next() < 0.5 ? -1 : 1) * (TURN.min + next() * (TURN.max - TURN.min)),
    }
    // Two draws that once set a shake's pace: kept, so the objects after this one stay where they have been put
    next()
    next()
    sprite.forEach((line, dy) => {
      for (let dx = 0; dx < width; dx++) {
        const code = line[flip ? width - 1 - dx : dx]
        if (code === '.') continue
        if (x + dx < cols && y + dy < rows) object[TONES[code as keyof typeof TONES]].push({ x: x + dx, y: y + dy })
      }
    })
    desk.objects.push(object)
    taken.push({ x0: x - 1, x1: x + width, y0: y - 1, y1: y + height })
  })

  // The stars: each column rolls for itself, so they do not move when the strip grows
  const free = (px: number, py: number) => !taken.some((t) => px >= t.x0 && px <= t.x1 && py >= t.y0 && py <= t.y1)
  for (let col = 0; col < cols; col++) {
    const roll = random((seed * 7919) ^ Math.imul(col + 1, 0x9e3779b1))
    if (roll() < STAR) {
      const y = Math.floor(roll() * rows)
      if (free(col, y)) desk.stars.push({ x: col, y })
    }
    if (roll() < CROSS && rows >= 3) {
      const y = 1 + Math.floor(roll() * (rows - 2))
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (col + dx >= 0 && col + dx < cols && free(col + dx, y + dy)) desk.stars.push({ x: col + dx, y: y + dy })
      }
    }
  }
  return desk
}

/** The pixels as one SVG path: each horizontal run of pixels is one rectangle */
export function pathOf(pixels: Pixel[]): string {
  const byRow = new Map<number, number[]>()
  for (const { x, y } of pixels) byRow.set(y, [...(byRow.get(y) ?? []), x])
  let d = ''
  for (const [y, xs] of byRow) {
    xs.sort((a, b) => a - b)
    for (let i = 0; i < xs.length;) {
      let end = i
      while (end + 1 < xs.length && xs[end + 1] <= xs[end] + 1) end++
      const from = xs[i]
      const to = xs[end]
      d += `M${from} ${y}h${to - from + 1}v1h-${to - from + 1}z`
      i = end + 1
    }
  }
  return d
}
