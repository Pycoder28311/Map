// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), fading into a dark pixel-art wooden
// surface (boards, seams, grain, knots) over a brown base; the page's edges a little darker. The wood is a small see-through SVG tile of
// BACKDROP_PIXEL px pixels, drawn here from a fixed seed, so it is the same every time. Pure.

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
 * A dark wooden surface over everything, faint and see-through (so the base's colour shows through): horizontal boards, each with a dark
 * seam under it, its ends at different places from the boards above and below, grain streaks along it (darker and lighter), and a knot
 * here and there
 */
function wood(): { image: string; w: number; h: number } {
  const next = seeded(9)
  const W = 96
  const BOARD = 7
  const BOARDS = 4
  const H = BOARD * BOARDS
  let body = ''
  for (let b = 0; b < BOARDS; b++) {
    const top = b * BOARD
    // the board's tone, a little different from its neighbours'
    body += rect(0, top, W, BOARD, b % 2 ? 'rgb(255 200 150 / 0.025)' : 'rgb(0 0 0 / 0.05)')
    // grain streaks along it
    for (let row = top; row < top + BOARD - 1; row++) {
      for (let x = Math.floor(next() * 8); x < W; x += 6 + Math.floor(next() * 14)) {
        const length = Math.min(4 + Math.floor(next() * 14), W - x)
        body += rect(x, row, length, 1, next() < 0.65 ? 'rgb(0 0 0 / 0.14)' : 'rgb(255 215 175 / 0.05)')
      }
    }
    // a knot now and then: a dark ring with a darker heart
    if (next() < 0.6) {
      const kx = 8 + Math.floor(next() * (W - 16))
      const ky = top + 2
      body += rect(kx - 1, ky, 3, 2, 'rgb(0 0 0 / 0.18)') + rect(kx, ky, 1, 2, 'rgb(0 0 0 / 0.3)')
    }
    // the seam under it, and where it ends (its joint with the next board along), staggered from board to board
    body += rect(0, top + BOARD - 1, W, 1, 'rgb(0 0 0 / 0.35)')
    const joint = (b * 37 + 20) % W
    body += rect(joint, top, 1, BOARD - 1, 'rgb(0 0 0 / 0.3)')
  }
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/** The CSS of the wooden surface (under the sky picture, which fades into it) */
export function woodStyle(): Record<string, string> {
  const g = wood()
  return { backgroundImage: g.image, backgroundRepeat: 'repeat', backgroundSize: `${g.w}px ${g.h}px` }
}

/** The page's edges a little darker, over everything */
export const VIGNETTE = 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 65%, rgb(0 0 0 / 0.35) 100%)'
