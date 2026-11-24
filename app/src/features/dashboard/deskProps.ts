// The things lying on the Dashboard's desk, in its margins (DeskProps.tsx): a candle, an inkwell with a quill, a brass compass, a rolled
// scroll, the corner of an old map and a bronze sundial. Each is a grid of letters, one per pixel ('.' is empty, the others colours of DESK_PALETTE),
// drawn by hand here or built from a fixed recipe, so they are the same every time. Pure.

export const DESK_PALETTE: Record<string, string> = {
  k: '#140f0c', // outline
  W: '#e9dcc0', // wax
  w: '#bfae8c', // wax in shade
  F: '#fff3c0', // flame's core
  f: '#ffd35a', // flame
  o: '#f08a24', // flame's edge
  h: '#f2d27a', // brass, lit
  g: '#d6a640', // brass
  G: '#8a6420', // brass in shade
  P: '#eadbb4', // parchment, lit
  p: '#d8c59a', // parchment
  q: '#a89068', // parchment in shade
  l: '#6b5236', // ink line on parchment
  i: '#22303d', // ink glass
  I: '#4a6478', // glass highlight
  E: '#efe8dc', // feather
  e: '#a9a296', // feather in shade
  r: '#b8382b', // red (the compass needle, the map's route)
  s: '#d5dbe3', // silver
  t: '#6b3a1e', // the scroll's ties
  v: '#5f8f7a', // verdigris, the green on old bronze
}

/** A grid padded on the right to its widest row */
const grid = (rows: string[]) => {
  const w = Math.max(...rows.map((r) => r.length))
  return rows.map((r) => r.padEnd(w, '.'))
}

const candle = grid([
  '......o',
  '.....ofo',
  '.....fFf',
  '....ofFFo',
  '....fFFFf',
  '....ofFfo',
  '.....fFf',
  '......k',
  '...kkkkkkk',
  '...kWWWWwk',
  '...kWWWWwkk',
  '...kWWWWwWk',
  '...kWWWWwWk',
  '...kWWWWwkk',
  '...kWWWWwk',
  '...kWWWWwk',
  '...kWWWWwk',
  '...kWWWWwk',
  '...kWWWWwk',
  '...kWWWWwk',
  '.kkkkkkkkkkkk',
  'khhhgggggggGGk',
  'kGgggggggggGGk',
  '.kGGGGGGGGGGk',
  '..kkkkkkkkkk',
])

const inkwell = grid([
  '...............kk',
  '..............kEEk',
  '.............kEEek',
  '............kEEEek',
  '...........kEEEek',
  '..........kEEEek',
  '.........kEEEek',
  '........kEEEek',
  '.......kEEek',
  '.......kEek',
  '......kGk',
  '......kGk',
  '....kkkGkkk',
  '....kiIGiik',
  '..kkkiiGiikkk',
  '.kiiiiiiiiiiik',
  'kiIiiiiiiiiiiik',
  'kiIiiiiiiiiiiik',
  'kiIiiiiiiiiiiik',
  'kiiiiiiiiiiiiik',
  '.kiiiiiiiiiiik',
  '..kkkkkkkkkkk',
])

/** The compass: a brass ring round a parchment face with its four marks, the needle red to the north and silver to the south */
function compass(): string[] {
  const N = 19
  const c = (N - 1) / 2
  const rows: string[] = []
  for (let y = 0; y < N; y++) {
    let row = ''
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d > 9.3) row += '.'
      else if (d > 8.4) row += 'k'
      else if (d > 6.6) row += x + y < N - 3 ? 'h' : x + y > N + 3 ? 'G' : 'g'
      else if (d > 5.8) row += 'k'
      else if (x === c && y < c) row += y < c - 4 ? 'l' : 'r'
      else if (x === c && y > c) row += y > c + 4 ? 'l' : 's'
      else if (y === c && Math.abs(x - c) > 4) row += 'l'
      else if (x === c && y === c) row += 'k'
      else row += d < 4.5 && x + y < N - 1 ? 'P' : 'p'
    }
    rows.push(row)
  }
  // the ring at the top, for its lid's hinge
  rows.unshift('.'.repeat(c - 1) + 'kgk' + '.'.repeat(c - 1), '.'.repeat(c - 1) + 'kkk' + '.'.repeat(c - 1))
  return rows
}

/** A rolled scroll lying across: its paper lit along the top, in shade along the bottom, its rolled ends showing, two ties round it */
function scroll(): string[] {
  const W = 34
  const H = 9
  const rows: string[] = []
  for (let y = 0; y < H; y++) {
    let row = ''
    for (let x = 0; x < W; x++) {
      const edgeY = y === 0 || y === H - 1
      const edgeX = x === 0 || x === W - 1
      if (edgeY && edgeX) row += '.'
      else if (edgeY || edgeX) row += 'k'
      else if (x <= 2 || x >= W - 3) row += y === Math.floor(H / 2) && (x === 2 || x === W - 3) ? 'l' : 'q'
      else if (x === 11 || x === 12 || x === 22 || x === 23) row += 't'
      else row += y === 1 ? 'P' : y >= H - 3 ? 'q' : 'p'
    }
    rows.push(row)
  }
  return rows
}

/** The corner of an old map, its paper's edge ragged: a coastline, a dotted red route and a mark where it ends */
function mapSheet(): string[] {
  const W = 46
  const H = 34
  let seed = 21
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  // how far in the ragged edge is at each row (left and right sides) and each column (top and bottom)
  const ragged = (n: number) => Array.from({ length: n }, () => Math.floor(next() * 2))
  const left = ragged(H)
  const right = ragged(H).map((d) => W - 1 - d)
  const top = ragged(W)
  const bottom = ragged(W).map((d) => H - 1 - d)
  const rows: string[] = []
  for (let y = 0; y < H; y++) {
    let row = ''
    for (let x = 0; x < W; x++) {
      if (x < left[y] || x > right[y] || y < top[x] || y > bottom[x]) {
        row += '.'
        continue
      }
      if (x === left[y] || x === right[y] || y === top[x] || y === bottom[x]) {
        row += 'q'
        continue
      }
      const coast = 14 + 5 * Math.sin(x / 6) + 2 * Math.sin(x / 2.3)
      const route = Math.abs(y - (26 - x * 0.35)) < 0.6 && x > 8 && x < 38 && x % 3 !== 0
      if (Math.abs(y - coast) < 0.7) row += 'l'
      else if (route) row += 'r'
      else if ((x === 37 || x === 39) && (y === 12 || y === 14)) row += 'r'
      else if (x === 38 && y === 13) row += 'r'
      else if (y < coast && (x + y * 3) % 7 === 0 && y % 3 === 0) row += 'q' // the sea's waves, faint
      else row += next() < 0.08 ? 'q' : 'p'
    }
    rows.push(row)
  }
  return rows
}

/**
 * A bronze sundial seen from above: a round plate with a rim, an engraved ring and the hour lines fanning out over its upper half, each
 * ending in a mark, green patina here and there, and the gnomon (its upright blade) from the middle to the top, casting a thin shadow
 */
function sundial(): string[] {
  const N = 31
  const c = (N - 1) / 2
  let seed = 7
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  // the plate: rim, face (lighter toward the top left), green patina in a few spots near the rim, the engraved ring round the middle
  const px: string[][] = []
  for (let y = 0; y < N; y++) {
    const row: string[] = []
    for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - c, y - c)
      if (d > 15.3) row.push('.')
      else if (d > 14.4) row.push('k')
      else if (d > 12.6) row.push(x + y < N - 4 ? 'h' : x + y > N + 4 ? 'G' : 'g')
      else if (d > 11.9) row.push('G')
      else if (Math.abs(d - 3.2) < 0.5) row.push('G')
      else if (d > 9 && next() < 0.12) row.push('v')
      else row.push(d < 8 && x + y < N - 2 ? 'h' : 'g')
    }
    px.push(row)
  }
  // the hour lines, from due west to due east over the top, every 15°: engraved from the ring out, a mark where each ends
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i * Math.PI) / 12
    for (let r = 4.2; r <= 10.4; r += 0.4) {
      const x = Math.round(c + r * Math.cos(a))
      const y = Math.round(c + r * Math.sin(a))
      px[y][x] = r > 9.6 ? 'k' : 'G'
    }
  }
  // the gnomon: a blade from the middle to the top, lit on its left, and its thin shadow to its right
  for (let y = c - 10; y <= c; y++) {
    px[y][c - 1] = 'h'
    px[y][c] = 'k'
    if (y > c - 8) px[y][c + 1] = 'G'
  }
  return px.map((row) => row.join(''))
}

export const DESK_SPRITES = {
  candle,
  inkwell,
  compass: compass(),
  scroll: scroll(),
  map: mapSheet(),
  sundial: sundial(),
} as const

export type DeskSpriteName = keyof typeof DESK_SPRITES
