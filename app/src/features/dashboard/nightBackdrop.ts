// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), fading into a dark pixel-art wooden
// surface (boards, seams, grain, knots) over a brown base; the page's edges a little darker. The wood is a small see-through SVG tile of
// BACKDROP_PIXEL px pixels, drawn here from a fixed seed, so it is the same every time. Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
export const BACKDROP = {
  /** The page's dark base: a deep night blue warmed toward brown */
  base: '#1c1714',
} as const
/** One pixel of the wood and the horizon on screen (px) */
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
 * A dark wooden table, faint and see-through (so the base's colour shows through): wide horizontal boards, each with a soft seam under
 * it and its end at a different place from the boards above and below, and low-contrast grain streaks along it; no knots
 */
function wood(): { image: string; w: number; h: number } {
  const next = seeded(9)
  const W = 128
  const BOARD = 10
  const BOARDS = 4
  const H = BOARD * BOARDS
  let body = ''
  for (let b = 0; b < BOARDS; b++) {
    const top = b * BOARD
    // the board's tone, a little different from its neighbours'
    body += rect(0, top, W, BOARD, b % 2 ? 'rgb(255 205 160 / 0.025)' : 'rgb(0 0 0 / 0.04)')
    // grain streaks along it, long and faint
    for (let row = top; row < top + BOARD - 1; row++) {
      for (let x = Math.floor(next() * 10); x < W; x += 10 + Math.floor(next() * 18)) {
        const length = Math.min(6 + Math.floor(next() * 18), W - x)
        body += rect(x, row, length, 1, next() < 0.65 ? 'rgb(0 0 0 / 0.08)' : 'rgb(255 218 180 / 0.035)')
      }
    }
    // the seam under it, and where it ends (its joint with the next board along), staggered from board to board
    body += rect(0, top + BOARD - 1, W, 1, 'rgb(0 0 0 / 0.22)')
    const joint = (b * 53 + 30) % W
    body += rect(joint, top, 1, BOARD - 1, 'rgb(0 0 0 / 0.18)')
  }
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/**
 * The horizon where the sky ends: a dark silhouette of rolling hills with a ragged treeline on them, in the base's colour, so the sky
 * meets the table at a horizon rather than fading into it. A tile repeated across, solid below its outline
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


/** The CSS of the wooden surface (under the sky picture, which fades into it) */
export function woodStyle(): Record<string, string> {
  const g = wood()
  return { backgroundImage: g.image, backgroundRepeat: 'repeat', backgroundSize: `${g.w}px ${g.h}px` }
}

/** The page's edges a little darker, over everything */
export const VIGNETTE = 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 58%, rgb(0 0 0 / 0.5) 100%)'

/** A lantern's warm light pooled on the table round the note input and the Create buttons (its middle `top` px down the page) */
export const lanternGlow = (top: number) =>
  `radial-gradient(ellipse 620px 300px at 50% ${top}px, rgb(255 180 90 / 0.09), rgb(255 170 80 / 0.04) 45%, transparent 75%)`
