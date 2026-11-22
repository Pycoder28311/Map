// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), fading into a dark pixel-art wooden
// surface (boards, seams, grain, knots) over a brown base; the page's edges a little darker. The wood is a small see-through SVG tile of
// BACKDROP_PIXEL px pixels, drawn here from a fixed seed, so it is the same every time. Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
/** How the table looks: 'desk' is a lit cartographer's desk (lighter walnut with clear grain, a wide lantern pool, things on the desk
 *  in the margins: DeskProps.tsx); 'quiet' is the earlier, very dark and faint table */
export const LOOK: 'desk' | 'quiet' = 'desk'

const LOOKS = {
  desk: { base: '#2e231b', grain: 2.6, glow: { w: 1150, h: 720, mid: 0.19, edge: 0.08 }, vignette: 0.55 },
  quiet: { base: '#1c1714', grain: 1, glow: { w: 620, h: 300, mid: 0.09, edge: 0.04 }, vignette: 0.5 },
} as const
const LOOK_NOW = LOOKS[LOOK]

export const BACKDROP = {
  /** The page's base: a warm walnut brown (desk), or a near-black brown (quiet) */
  base: LOOK_NOW.base,
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
  // how strong the grain, the boards' tones and the seams are (LOOK)
  const k = LOOK_NOW.grain
  const a = (alpha: number) => Math.min(1, alpha * k).toFixed(3)
  // each board's own tone: lighter and darker planks, so they read as boards
  const tones = ['rgb(0 0 0 / 0.04)', 'rgb(255 205 160 / 0.025)', 'rgb(0 0 0 / 0.07)', 'rgb(255 215 170 / 0.04)']
  let body = ''
  for (let b = 0; b < BOARDS; b++) {
    const top = b * BOARD
    // the board's tone, a little different from its neighbours'
    body += rect(0, top, W, BOARD, tones[b].replace(/[\d.]+\)$/, (m) => `${a(parseFloat(m))})`))
    // grain streaks along it, long and faint
    for (let row = top; row < top + BOARD - 1; row++) {
      for (let x = Math.floor(next() * 10); x < W; x += 10 + Math.floor(next() * 18)) {
        const length = Math.min(6 + Math.floor(next() * 18), W - x)
        body += rect(x, row, length, 1, next() < 0.65 ? `rgb(0 0 0 / ${a(0.08)})` : `rgb(255 218 180 / ${a(0.035)})`)
      }
    }
    // the seam under it, and where it ends (its joint with the next board along), staggered from board to board
    body += rect(0, top + BOARD - 1, W, 1, `rgb(0 0 0 / ${Math.min(0.42, 0.22 * k)})`)
    const joint = (b * 53 + 30) % W
    body += rect(joint, top, 1, BOARD - 1, `rgb(0 0 0 / ${Math.min(0.36, 0.18 * k)})`)
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
export const VIGNETTE = `radial-gradient(ellipse 80% 70% at 50% 40%, transparent 58%, rgb(0 0 0 / ${LOOK_NOW.vignette}) 100%)`

/** A lantern's warm light pooled on the table round the note input and the Create buttons (its middle `top` px down the page) */
export const lanternGlow = (top: number) => {
  const { w, h, mid, edge } = LOOK_NOW.glow
  return `radial-gradient(ellipse ${w}px ${h}px at 50% ${top}px, rgb(255 180 90 / ${mid}), rgb(255 170 80 / ${edge}) 45%, transparent 75%)`
}
