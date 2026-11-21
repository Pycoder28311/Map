// The Dashboard's background (NightBackdrop.tsx), in pixel art: a warm dark base with a faint grain over all of it, and at the top a misty
// dusk: a soft mauve sky with a few stars and a pale moon, a dim vine along the top edge, two ridges of hills fading into the dark under
// the greeting; the page's edges a little darker. Each picture is a small SVG tile of BACKDROP_PIXEL px pixels (repeated across), drawn
// here from a fixed seed, so it is the same every time. Pure.

// ── The colours and sizes to change ──────────────────────────────────────────────────────────────────────────────────────────────
export const BACKDROP = {
  /** The page's dark base */
  base: '#201719',
  /** The sky at the very top, and lower down (it fades into the base) */
  skyTop: '#6a5761',
  skyMid: '#5a4852',
  skyLow: '#47383f',
  /** The far ridge and the near one */
  ridgeFar: '#382a31',
  ridgeNear: '#2a1f24',
  /** Stars (bright and dim) and the moon */
  starBright: '#b8a9b0',
  starDim: '#8a7a82',
  moon: '#a89aa0',
  moonLight: '#c4b8bd',
  /** The vine along the top */
  vine: '#8a7480',
  leaf: '#7a6470',
} as const
/** One pixel of the pictures on screen (px) */
export const BACKDROP_PIXEL = 4
/** How far down the scene goes (px): the hills start at RIDGE_TOP and are dark by FADE_END (before their picture ends: no seam); the sky
 *  fades out by SKY_END */
const RIDGE_TOP = 10
const FADE_START = 190
const FADE_END = 280
const SKY_END = 330
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
      else if (roll < 0.24) body += rect(x, y, 1, 1, 'rgb(255 235 245 / 0.045)')
      else if (roll < 0.27) body += rect(x, y, 2, 1, 'rgb(0 0 0 / 0.08)')
    }
  return { image: tile(N, N, body), size: N * U }
}

/** The vine along the top edge: a wave with a curl and a leaf now and then */
function vine(): { image: string; w: number; h: number } {
  const W = 96
  const H = 17
  let body = ''
  for (let x = 0; x < W; x++) body += rect(x, Math.round(8 + 4 * Math.sin((x / W) * Math.PI * 4)), 1, 1, BACKDROP.vine)
  for (let k = 0; k < 4; k++) {
    const cx = 12 + k * 24
    const cy = k % 2 ? 4 : 12
    for (let a = 0; a < 7; a++) {
      const t = (a / 7) * Math.PI * 1.6
      body += rect(Math.round(cx + Math.cos(t) * 3), Math.round(cy + Math.sin(t) * 3), 1, 1, BACKDROP.vine)
    }
    body += rect(cx + 6, cy - 1, 2, 1, BACKDROP.leaf) + rect(cx + 7, cy, 1, 1, BACKDROP.leaf)
  }
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/** The hills, two ridges, with the stars and the moon in the sky over them */
function ridges(): { image: string; w: number; h: number } {
  const next = seeded(9)
  const W = 240
  const H = 70
  const ridge = (x: number, base: number, amp: number, f: number, ph: number) =>
    Math.round(base - amp * (0.6 * Math.abs(Math.sin(x / f + ph)) + 0.4 * Math.abs(Math.sin(x / (f * 0.37) + ph * 2))))
  let body = ''
  for (let x = 0; x < W; x++) {
    const far = ridge(x, 62, 26, 34, 0.7)
    body += rect(x, far, 1, H - far, BACKDROP.ridgeFar)
    const near = ridge(x, 68, 16, 22, 2.1)
    body += rect(x, near, 1, H - near, BACKDROP.ridgeNear)
  }
  for (let i = 0; i < 26; i++) body += rect(Math.floor(next() * W), Math.floor(next() * 30), 1, 1, next() < 0.3 ? BACKDROP.starBright : BACKDROP.starDim)
  body += rect(205, 2, 4, 4, BACKDROP.moon) + rect(204, 3, 6, 2, BACKDROP.moon) + rect(205, 3, 3, 2, BACKDROP.moonLight)
  return { image: tile(W, H, body), w: W * U, h: H * U }
}

/** The background's CSS: its layers, front to back (the vine, the grain, the darker edges, the fade under the hills, the hills, the sky) */
export function backdropStyle(): Record<string, string> {
  const g = grain()
  const v = vine()
  const r = ridges()
  const layers: { image: string; repeat: string; position: string; size: string }[] = [
    { image: v.image, repeat: 'repeat-x', position: '0 8px', size: `${v.w}px ${v.h}px` },
    { image: g.image, repeat: 'repeat', position: '0 0', size: `${g.size}px ${g.size}px` },
    { image: 'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 65%, rgb(0 0 0 / 0.35) 100%)', repeat: 'no-repeat', position: '0 0', size: '100% 100%' },
    { image: `linear-gradient(to bottom, transparent ${FADE_START}px, ${BACKDROP.base} ${FADE_END}px)`, repeat: 'no-repeat', position: '0 0', size: `100% ${FADE_END}px` },
    { image: r.image, repeat: 'repeat-x', position: `0 ${RIDGE_TOP}px`, size: `${r.w}px ${r.h}px` },
    {
      image: `linear-gradient(to bottom, ${BACKDROP.skyTop} 0, ${BACKDROP.skyMid} 120px, ${BACKDROP.skyLow} 170px, rgb(32 23 25 / 0) ${SKY_END}px)`,
      repeat: 'no-repeat',
      position: '0 0',
      size: `100% ${SKY_END}px`,
    },
  ]
  return {
    backgroundColor: BACKDROP.base,
    backgroundImage: layers.map((l) => l.image).join(', '),
    backgroundRepeat: layers.map((l) => l.repeat).join(', '),
    backgroundPosition: layers.map((l) => l.position).join(', '),
    backgroundSize: layers.map((l) => l.size).join(', '),
  }
}
