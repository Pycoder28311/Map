// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), crumbling in a pixel gradient into a
// dark pixel-art wood-grain surface over a brown base; the page's edges a little darker. The wood and the fade are small see-through SVG
// tiles of BACKDROP_PIXEL px pixels, drawn here (the wood from a fixed seed, the same every time). Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
export const BACKDROP = {
  /** The page's dark base: a deep night blue warmed toward brown */
  base: '#211c1c',
} as const
/** One pixel of the wooden surface on screen (px) */
export const BACKDROP_PIXEL = 4
/** The sky picture: its width ÷ height, and where (as a share of its height) it starts fading into the base, and how much darker it is
 *  made (so the greeting reads on it) */
export const SKY_RATIO = 1254 / 460
export const SKY_FADE_FROM = 0.68
export const SKY_DIM = 0.12
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const U = BACKDROP_PIXEL

/** A tile w × h pixels as a CSS url(), its pixels crisp */
const tile = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w * U}' height='${h * U}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'>${body}</svg>`)}")`
const rect = (x: number, y: number, w: number, h: number, fill: string) => `<rect x='${x}' y='${y}' width='${w}' height='${h}' fill='${fill}'/>`

function seeded(start: number) {
  let seed = start
  return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
}

/**
 * A dark wooden surface, faint and see-through (so the base's colour shows through): long grain lines flowing across it, waving gently,
 * broken here and there, bending round a couple of knots, with a lighter streak between them now and then; no boards or seams. The waves
 * repeat a whole number of times across the tile and the lines a whole number of times down it, so it tiles without a seam.
 */
function wood(): { image: string; w: number; h: number } {
  const next = seeded(9)
  const W = 160
  const H = 60
  /** How far apart the grain lines are (pixels): H is a whole number of them */
  const GAP = 5
  // Knots: where they are, and how far they push the grain around them
  const knots = [
    { x: 40, y: 22, r: 6, push: 4 },
    { x: 118, y: 44, r: 5, push: 3 },
  ]
  // A gentle wave across the tile (whole cycles, so its two ends meet)
  const wave = (x: number, y: number) =>
    2.2 * Math.sin((2 * Math.PI * x) / W + y * 0.05) + 1.1 * Math.sin((2 * Math.PI * 3 * x) / W + 1.3) + 0.6 * Math.sin((2 * Math.PI * 5 * x) / W + 0.4)
  let body = ''
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = y + wave(x, y)
      for (const k of knots) {
        const d = Math.hypot(x - k.x, (y - k.y) * 1.6)
        v += k.push * Math.exp(-((d / k.r) ** 2)) * Math.sign(y - k.y || 1)
      }
      const phase = ((Math.round(v) % GAP) + GAP) % GAP
      const roll = next()
      if (phase === 0 && roll < 0.85) body += rect(x, y, 1, 1, 'rgb(0 0 0 / 0.2)')
      else if (phase === 2 && roll < 0.22) body += rect(x, y, 1, 1, 'rgb(255 214 170 / 0.05)')
    }
  }
  // the knots' dark hearts
  for (const k of knots) body += rect(k.x - 1, k.y, 3, 1, 'rgb(0 0 0 / 0.3)') + rect(k.x, k.y - 1, 1, 3, 'rgb(0 0 0 / 0.3)')
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/** An 8 × 8 ordered dither: which pixels show for each share of coverage (0–63), so a fade reads as an even pixel gradient */
const BAYER8 = (() => {
  const m = [[0]]
  let size = 1
  let out = m
  while (size < 8) {
    const next: number[][] = Array.from({ length: size * 2 }, () => Array(size * 2).fill(0))
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const v = out[y][x] * 4
        next[y][x] = v
        next[y][x + size] = v + 2
        next[y + size][x] = v + 3
        next[y + size][x + size] = v + 1
      }
    out = next
    size *= 2
  }
  return out
})()

/**
 * The mask of the sky picture's fading edge, `rows` pixels of BACKDROP_PIXEL px tall: a tile 8 pixels wide (repeated across) where each
 * row lets less of the picture through, in an ordered dither, so the picture crumbles into the wood below in pixels, smoothly
 */
export function skyFadeMask(rows: number): { image: string; w: number; h: number } {
  let body = ''
  for (let y = 0; y < rows; y++) {
    const keep = 1 - (y + 0.5) / rows
    for (let x = 0; x < 8; x++) if (BAYER8[y % 8][x] < keep * 64) body += rect(x, y, 1, 1, 'black')
  }
  return { image: tile(8, Math.max(1, rows), body), w: 8 * U, h: Math.max(1, rows) * U }
}

/** The CSS of the wooden surface (under the sky picture, which fades into it) */
export function woodStyle(): Record<string, string> {
  const g = wood()
  return { backgroundImage: g.image, backgroundRepeat: 'repeat', backgroundSize: `${g.w}px ${g.h}px` }
}

/** The page's edges a little darker, over everything */
export const VIGNETTE = 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 65%, rgb(0 0 0 / 0.35) 100%)'
