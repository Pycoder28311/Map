// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), fading into a dark pixel-art slate
// floor (flagstones, mortar, cracks) over a cool charcoal base; the page's edges a little darker. The floor is a small see-through SVG tile of
// BACKDROP_PIXEL px pixels, drawn here from a fixed seed, so it is the same every time. Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
/** Which floor lies under the sky: dark old parchment (a giant map under everything), dark green felt (a war table's), or dark slate */
export const SURFACE: 'parchment' | 'felt' | 'slate' = 'parchment'

/** Each floor's dark base colour */
const BASES = { parchment: '#221d16', felt: '#14201a', slate: '#1a1c20' } as const

export const BACKDROP = {
  /** The page's dark base: the floor's (deep bottle green felt, or cool charcoal slate); warm cards and brass stand out on either */
  base: BASES[SURFACE],
} as const
/** One pixel of the floor and the horizon on screen (px) */
export const BACKDROP_PIXEL = 5
/** The sky picture: its width ÷ height, and where (as a share of its height) it starts fading into the base, and how much darker it is
 *  made (so the greeting reads on it) */
export const SKY_RATIO = 1254 / 460
export const SKY_FADE_FROM = 0.78
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
 * A dark slate floor, faint and see-through (so the base's colour shows through): rows of flagstones of different widths, the joints of
 * each row away from the row above's, between them dark mortar; each stone a little lighter or darker than its neighbours, a faint light
 * edge along its top and left, a crack in some, a chipped corner in a few. The rows' widths add up to the tile's, so it tiles without a seam
 */
function flagstones(): { image: string; w: number; h: number } {
  const next = seeded(21)
  const W = 128
  const ROWS = [14, 12, 15, 13]
  const H = ROWS.reduce((a, b) => a + b, 0)
  let body = ''
  let top = 0
  ROWS.forEach((rowH, r) => {
    // the stones of this row: widths of 16–34, the last one closing the row; the row starts part way into a stone, staggered
    const widths: number[] = []
    let left = W
    while (left > 0) {
      const w = left < 40 ? left : 16 + Math.floor(next() * 19)
      widths.push(Math.min(w, left))
      left -= Math.min(w, left)
    }
    let x = (r * 23) % W
    for (const w of widths) {
      const stone = (sx: number, sy: number, sw: number, sh: number, fill: string) => {
        // a rectangle in the stone, wrapped round the tile's right edge
        const at = (x + sx) % W
        body += rect(at, top + sy, Math.min(sw, W - at), sh, fill)
        if (at + sw > W) body += rect(0, top + sy, at + sw - W, sh, fill)
      }
      // its tone
      const tone = next()
      stone(0, 0, w, rowH, tone < 0.4 ? 'rgb(0 0 0 / 0.07)' : tone < 0.75 ? 'rgb(200 210 230 / 0.03)' : 'rgb(200 210 230 / 0.055)')
      // a faint light edge along its top and left
      stone(1, 1, w - 2, 1, 'rgb(220 228 240 / 0.05)')
      stone(1, 1, 1, rowH - 2, 'rgb(220 228 240 / 0.04)')
      // the mortar: along its bottom and its right side
      stone(0, rowH - 1, w, 1, 'rgb(0 0 0 / 0.42)')
      stone(w - 1, 0, 1, rowH, 'rgb(0 0 0 / 0.42)')
      // a crack now and then: a few pixels stepping down across it
      if (next() < 0.35) {
        let cx = 3 + Math.floor(next() * (w - 8))
        let cy = 2 + Math.floor(next() * 3)
        for (let k = 0; k < 4 + Math.floor(next() * 5) && cy < rowH - 2 && cx < w - 2; k++) {
          stone(cx, cy, 1, 1, 'rgb(0 0 0 / 0.3)')
          if (next() < 0.5) cx++
          cy++
        }
      }
      // a chipped corner now and then (its top right)
      if (next() < 0.25) stone(w - 3, 0, 2, 2, 'rgb(0 0 0 / 0.3)')
      x = (x + w) % W
    }
    top += rowH
  })
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/**
 * The horizon where the sky ends: a dark silhouette of rolling hills with a ragged treeline on them, in the base's colour, so the sky
 * meets the floor at a horizon rather than fading into it. A tile repeated across, solid below its outline
 */
export function horizonStyle(): Record<string, string> {
  const W = 160
  const H = 16
  let body = ''
  for (let x = 0; x < W; x++) {
    const hill = 7 + 2.2 * Math.sin((2 * Math.PI * x) / W + 0.6) + 1.4 * Math.sin((2 * Math.PI * 3 * x) / W + 2)
    // trees: a jagged edge on the hills, taller now and then
    const tree = ((x * 7) % 5 === 0 ? 2 : (x * 3) % 4 === 0 ? 1 : 0) + ((x * 13) % 23 === 0 ? 2 : 0)
    const top = Math.max(0, Math.round(hill - tree))
    body += rect(x, top, 1, H - top, BACKDROP.base)
  }
  return { backgroundImage: tile(W, H, body), backgroundRepeat: 'repeat-x', backgroundSize: `${W * U}px ${H * U}px`, backgroundPosition: '0 0', height: `${H * U}px` }
}


/**
 * Dark green felt, faint and see-through (so the base's colour shows through): a fine woven crosshatch (lighter threads one way, darker
 * the other) with stray lighter fibres, almost flat, like the cloth on a war table
 */
function felt(): { image: string; w: number; h: number } {
  const next = seeded(33)
  const N = 32
  let body = ''
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const roll = next()
      if ((x + y) % 4 === 0) body += rect(x, y, 1, 1, 'rgb(170 225 190 / 0.035)')
      else if ((x - y + N) % 4 === 2) body += rect(x, y, 1, 1, 'rgb(0 0 0 / 0.09)')
      if (roll < 0.025) body += rect(x, y, 1, 1, 'rgb(190 235 205 / 0.06)')
      else if (roll < 0.05) body += rect(x, y, 1, 1, 'rgb(0 0 0 / 0.12)')
    }
  return { image: tile(N, N, body), w: N * U, h: N * U }
}

/**
 * Dark old parchment, faint and see-through (so the base's colour shows through), like a giant map lying under everything: soft blotches a
 * little lighter and darker, a fold across it each way (a dark crease and a light ridge beside it), and faint contour lines looping round
 * a few hills; the same every time (a fixed seed)
 */
function parchment(): { image: string; w: number; h: number } {
  const next = seeded(51)
  const W = 160
  const H = 120
  let body = ''
  // blotches: soft round stains, lighter or darker, each a few rings fading out (they wrap round the tile's edges)
  for (let k = 0; k < 14; k++) {
    const cx = next() * W
    const cy = next() * H
    const r = 5 + next() * 12
    const light = next() < 0.55
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r
        if (d > 1 || next() > 0.55 * (1 - d)) continue
        body += rect(((x % W) + W) % W, ((y % H) + H) % H, 1, 1, light ? 'rgb(255 230 180 / 0.035)' : 'rgb(0 0 0 / 0.08)')
      }
  }
  // contour lines: faint uneven loops round a few hills
  for (const [cx, cy, rings] of [[42, 34, 3], [118, 82, 4], [130, 22, 2]]) {
    for (let ring = 1; ring <= rings; ring++) {
      const r = ring * 5
      for (let a = 0; a < 360; a += 3) {
        const t = (a * Math.PI) / 180
        const rr = r * (1 + 0.18 * Math.sin(3 * t + cx) + 0.1 * Math.sin(5 * t + cy))
        if ((a / 3) % 7 === 6) continue
        body += rect(Math.round(cx + rr * Math.cos(t)), Math.round(cy + rr * 0.7 * Math.sin(t)), 1, 1, 'rgb(255 225 170 / 0.05)')
      }
    }
  }
  // the folds: a dark crease and a light ridge beside it, across and down
  body += rect(0, 59, W, 1, 'rgb(0 0 0 / 0.16)') + rect(0, 60, W, 1, 'rgb(255 230 185 / 0.035)')
  body += rect(79, 0, 1, H, 'rgb(0 0 0 / 0.16)') + rect(80, 0, 1, H, 'rgb(255 230 185 / 0.035)')
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/** A faint compass rose drawn on the parchment (one, on the right of the page under the sky): four long points and four short ones round a
 *  ring, a little lighter than the parchment */
export function compassRose(): { image: string; size: number } {
  const N = 41
  const c = 20
  const ink = 'rgb(255 225 170 / 0.09)'
  let body = ''
  // the ring
  for (let a = 0; a < 360; a += 4) {
    const t = (a * Math.PI) / 180
    body += rect(Math.round(c + 9 * Math.cos(t)), Math.round(c + 9 * Math.sin(t)), 1, 1, ink)
  }
  // the points: long ones north, south, east, west; short ones between
  for (let k = 0; k < 8; k++) {
    const t = (k * Math.PI) / 4
    const len = k % 2 === 0 ? 19 : 11
    for (let d = 0; d <= len; d++) {
      const w = Math.max(0, Math.round((1 - d / len) * (k % 2 === 0 ? 2.5 : 1.5)))
      for (let side = -w; side <= w; side++)
        body += rect(Math.round(c + d * Math.cos(t) - side * Math.sin(t)), Math.round(c + d * Math.sin(t) + side * Math.cos(t)), 1, 1, ink)
    }
  }
  return { image: tile(N, N, body), size: N * U }
}

/** The CSS of the floor under the sky picture (SURFACE: parchment, felt or slate) */
export function floorStyle(): Record<string, string> {
  const g = SURFACE === 'parchment' ? parchment() : SURFACE === 'felt' ? felt() : flagstones()
  return { backgroundImage: g.image, backgroundRepeat: 'repeat', backgroundSize: `${g.w}px ${g.h}px` }
}

/** The page's edges a little darker, over everything */
export const VIGNETTE = 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 58%, rgb(0 0 0 / 0.5) 100%)'

/** A lantern's warm light pooled on the floor round the note input and the Create buttons (its middle `top` px down the page) */
export const lanternGlow = (top: number) =>
  `radial-gradient(ellipse 620px 300px at 50% ${top}px, rgb(255 180 90 / 0.09), rgb(255 170 80 / 0.04) 45%, transparent 75%)`
