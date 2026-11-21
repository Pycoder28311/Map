// The Dashboard's background (NightBackdrop.tsx): at the top, the night sky over the distant castle (a crop of the old night picture,
// assets/dashboard-sky.jpg: its clouds and stars, the lit castle across the valley, the river), fading into a dark base warmed toward brown; over
// all of it a faint see-through pixel grain, and the page's edges a little darker. The grain is a small SVG tile of BACKDROP_PIXEL px
// pixels, drawn here from a fixed seed, so it is the same every time. Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
export const BACKDROP = {
  /** The page's dark base: a deep night blue warmed toward brown */
  base: '#211c1c',
} as const
/** One pixel of the grain on screen (px) */
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

/** The grain over everything: a sparse scatter of slightly darker and lighter pixels, see-through, so it is faint on any colour */
function grain(): { image: string; size: number } {
  const next = seeded(9)
  const N = 24
  let body = ''
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const roll = next()
      if (roll < 0.14) body += rect(x, y, 1, 1, 'rgb(0 0 0 / 0.13)')
      else if (roll < 0.24) body += rect(x, y, 1, 1, 'rgb(255 220 190 / 0.05)')
      else if (roll < 0.27) body += rect(x, y, 2, 1, 'rgb(40 20 8 / 0.12)')
    }
  return { image: tile(N, N, body), size: N * U }
}

/** The CSS of what lies over the picture: the grain, and the page's edges a little darker */
export function overlayStyle(): Record<string, string> {
  const g = grain()
  return {
    backgroundImage: [`${g.image}`, 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 65%, rgb(0 0 0 / 0.35) 100%)'].join(', '),
    backgroundRepeat: 'repeat, no-repeat',
    backgroundPosition: '0 0, 0 0',
    backgroundSize: `${g.size}px ${g.size}px, 100% 100%`,
  }
}
