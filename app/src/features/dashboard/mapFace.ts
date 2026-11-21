// The Create map button's face as a pixel-art map (BigCreateButton.tsx), filling the face inside its light rim: green land on the left
// (light grass dotted with trees, darker forest patches, lighter meadows) down to a sandy coast with shallows, and the sea on the right (deep and mid blue,
// little wave marks) with a big island in it (shallows, a beach, grass, forest and a few mountains). On the button's pixel grid; drawn
// from a fixed seed, so it is the same every time. Pure.

// ── The colours to change ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const MAP_FACE = {
  grass: '#a8c872',
  grassLight: '#bdd88a',
  forest: '#6e9a4a',
  forestDark: '#557d38',
  sand: '#d8c88e',
  shallow: '#8cc4cf',
  sea: '#5c9cbc',
  seaDeep: '#4e8aaa',
  wave: '#86bfd6',
  mountain: '#6b6a5c',
  snow: '#e4e2d6',
} as const
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

type Rect = [x: number, y: number, w: number, h: number, fill: string]

/** A pseudo-random number in [0, 1) from a pixel's place: the same every time, with no pattern to it */
const scatter = (i: number, j: number) => {
  const v = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453
  return v - Math.floor(v)
}

function seeded(start: number) {
  let seed = start
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
}

/**
 * The map on a face `width` pixels wide, its inside from (x0, y0) to (x1, y1) (inside the rim): the coast runs down at about two fifths
 * of the way across, wavering; the island sits in the sea's middle. Each row's runs of one colour are one rectangle.
 */
export function mapFacePixels(x0: number, y0: number, x1: number, y1: number): Rect[] {
  const next = seeded(17)
  const w = x1 - x0 + 1
  const h = y1 - y0 + 1
  // The coast: how far across the land reaches on each row (a wavering line)
  const coast = Array.from({ length: h }, (_, j) => Math.round(w * 0.4 + 3 * Math.sin(j / 4) + 2 * Math.sin(j / 1.7 + 1)))
  // The island: an uneven oval in the sea
  const cx = Math.round(w * 0.72)
  const cy = Math.round(h * 0.52)
  const rx = w * 0.17
  const ry = h * 0.36
  const islandD = (i: number, j: number) => {
    const a = Math.atan2(j - cy, i - cx)
    const r = 1 + 0.14 * Math.sin(3 * a + 0.7) + 0.09 * Math.sin(5 * a + 2)
    return Math.hypot((i - cx) / (rx * r), (j - cy) / (ry * r))
  }
  // Patches of forest and meadow: a few blobs
  const blobs = Array.from({ length: 7 }, () => ({ x: next() * w, y: next() * h, r: 2 + next() * 3.5, dark: next() < 0.6 }))
  const mountains = [
    [cx - 3, cy - 2],
    [cx + 3, cy - 4],
    [cx + 1, cy + 3],
  ]
  const grid: string[][] = []
  for (let j = 0; j < h; j++) {
    const row: string[] = []
    for (let i = 0; i < w; i++) {
      let colour: string
      const toCoast = i - coast[j]
      const d = islandD(i, j)
      if (toCoast < 0) {
        // the land
        const blob = blobs.find((b) => Math.hypot(i - b.x, (j - b.y) * 1.3) < b.r && b.x < coast[j] - 2)
        colour = blob ? (blob.dark ? MAP_FACE.forest : MAP_FACE.grassLight) : MAP_FACE.grass
        // little trees dotted over the land
        if (!blob && scatter(i, j) < 0.07) colour = MAP_FACE.forestDark
        if (toCoast >= -2) colour = MAP_FACE.sand
      } else if (d < 0.72) colour = (i * 3 + j * 5) % 9 === 0 ? MAP_FACE.forestDark : d < 0.45 && (i + j) % 4 === 0 ? MAP_FACE.forest : MAP_FACE.grass
      else if (d < 0.86) colour = MAP_FACE.sand
      else if (d < 1.12 || toCoast < 3) colour = MAP_FACE.shallow
      else colour = (j * 7 + i * 3) % 23 === 0 ? MAP_FACE.wave : i > coast[j] + w * 0.18 && (i + j * 2) % 7 === 0 ? MAP_FACE.seaDeep : MAP_FACE.sea
      row.push(colour)
    }
    grid.push(row)
  }
  // wave marks: little ‿ shapes on the open sea
  for (let k = 0; k < 9; k++) {
    const i = Math.floor(coast[0] + 5 + next() * (w - coast[0] - 8))
    const j = 1 + Math.floor(next() * (h - 3))
    if (islandD(i, j) < 1.25 || islandD(i + 2, j) < 1.25) continue
    for (const [di, dj] of [[0, 0], [1, 1], [2, 0]]) if (grid[j + dj]?.[i + di]) grid[j + dj][i + di] = MAP_FACE.wave
  }
  // mountains on the island: a little peak, snow at its top
  for (const [mx, my] of mountains) {
    const peak: [number, number, string][] = [[0, -1, MAP_FACE.snow], [-1, 0, MAP_FACE.mountain], [0, 0, MAP_FACE.mountain], [1, 0, MAP_FACE.mountain], [-2, 1, MAP_FACE.mountain], [2, 1, MAP_FACE.mountain], [-1, 1, MAP_FACE.forestDark], [0, 1, MAP_FACE.mountain], [1, 1, MAP_FACE.forestDark]]
    for (const [di, dj, c] of peak) if (grid[my + dj]?.[mx + di]) grid[my + dj][mx + di] = c
  }
  const rects: Rect[] = []
  grid.forEach((row, j) => {
    for (let i = 0; i < row.length; ) {
      let end = i
      while (end + 1 < row.length && row[end + 1] === row[i]) end++
      rects.push([x0 + i, y0 + j, end - i + 1, 1, row[i]])
      i = end + 1
    }
  })
  return rects
}
