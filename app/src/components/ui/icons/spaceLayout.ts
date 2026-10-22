// Where the planets, moons and stars go in the navbar's pixel sky (SpaceStrip.tsx), for a sky `cols` × `rows` pixels. Pure and deterministic
// (spaceLayout.test.ts): from the left edge on, a place does not depend on how wide the sky is, so a wider window only adds more to the right.

/** Planets and moons, `k` is a pixel (the rest is empty): a ringed planet, a crescent, a dark planet, a banded one, a tiny moon */
export const SPRITES: string[][] = [
  ['......kkkk......', '.....k....k.....', '....k......k....', '....k.....kk....', 'kk..k....kkk..kk', 'kkkkkkkkkkkkkkkk', '.....kkkkkk.....', '......kkkk......'],
  ['...kk...', '.kkk....', '.kk.....', 'k.k.....', 'k..k....', 'k..k....', '.k..kk..', '.kk...kk', '...kkk..'],
  ['.kkkk.', 'k..kkk', 'k.kkkk', 'kkkkkk', 'kkkkkk', '.kkkk.'],
  ['....k....', '..kkkkk..', '.k.....k.', '.k.....k.', 'kkkkkkkkk', '.k.....k.', '.k.....k.', '..kkkkk..', '....k....'],
  ['kkk', 'k.k', 'kk.'],
]

/** A pixel of the sky */
export type Pixel = { x: number; y: number }
export type Sky = { planets: Pixel[]; stars: Pixel[] }

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

/** Most columns apart two bodies can be, and fewest: the sky is mostly stars, with a body now and then */
const GAP = { min: 16, max: 34 }
/** Stars: the chance of one in a column, and of a little cross of five */
const STAR = 0.12
const CROSS = 0.012

export function spaceLayout(cols: number, rows: number, seed = 11): Sky {
  const planets: Pixel[] = []
  const taken: { x0: number; x1: number; y0: number; y1: number }[] = []

  // The bodies, left to right, each in the next sprite (some turned around), at a height of its own
  const next = random(seed)
  let x = 3 + Math.floor(next() * 6)
  for (let n = 0; x < cols; n++) {
    const sprite = SPRITES[(n + Math.floor(next() * 2)) % SPRITES.length]
    const flip = next() < 0.5
    const height = sprite.length
    const width = sprite[0].length
    const y = rows > height ? Math.floor(next() * (rows - height)) : 0
    sprite.forEach((line, dy) => {
      for (let dx = 0; dx < width; dx++) {
        if (line[flip ? width - 1 - dx : dx] !== 'k') continue
        if (x + dx < cols && y + dy < rows) planets.push({ x: x + dx, y: y + dy })
      }
    })
    taken.push({ x0: x - 1, x1: x + width, y0: y - 1, y1: y + height })
    x += width + GAP.min + Math.floor(next() * (GAP.max - GAP.min))
  }

  // The stars: each column rolls for itself, so they do not move when the sky grows
  const free = (px: number, py: number) => !taken.some((t) => px >= t.x0 && px <= t.x1 && py >= t.y0 && py <= t.y1)
  const stars: Pixel[] = []
  for (let col = 0; col < cols; col++) {
    const roll = random((seed * 7919) ^ Math.imul(col + 1, 0x9e3779b1))
    if (roll() < STAR) {
      const y = Math.floor(roll() * rows)
      if (free(col, y)) stars.push({ x: col, y })
    }
    if (roll() < CROSS && rows >= 3) {
      const y = 1 + Math.floor(roll() * (rows - 2))
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        if (col + dx >= 0 && col + dx < cols && free(col + dx, y + dy)) stars.push({ x: col + dx, y: y + dy })
      }
    }
  }
  return { planets, stars }
}

/** The pixels as one SVG path: each horizontal run of pixels is one rectangle */
export function pathOf(pixels: Pixel[]): string {
  const byRow = new Map<number, number[]>()
  for (const { x, y } of pixels) byRow.set(y, [...(byRow.get(y) ?? []), x])
  let d = ''
  for (const [y, xs] of byRow) {
    xs.sort((a, b) => a - b)
    for (let i = 0; i < xs.length; ) {
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
