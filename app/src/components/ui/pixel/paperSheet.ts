// A sheet of old parchment drawn in pixels: its colours, its worn outline with a dog-ear (a CSS clip-path), the dog-ear's back and a few stains.
// The Dashboard's note input (QuickCreate, tall) and an article's Info box (InfoBox). Pure.

/** Muted, aged parchment: its paper, its leather-brown border, dark ink for words, faded ink for placeholders and labels, its ruled lines */
export const PARCHMENT = {
  bg: '#bcae90',
  border: '#5e4a33',
  fg: '#2e2118',
  subtle: '#4e3f2e',
  muted: '#5e4a33',
  line: '#9c8c6e',
  /** the folded corner's back */
  fold: '#8f8064',
  /** the darker aged edge inside its border */
  edge: 'inset 0 0 22px rgb(94 70 44 / 0.4)',
} as const

type Sheet = {
  /** its pixel (px): the outline goes in steps of this */
  px: number
  /** how far along each edge the dog-ear at the top right goes (px) */
  fold: number
  /** the wear's pattern (the same every time for one seed) */
  seed: number
  /** how many runs each edge is worn in: along the top and bottom, and down the sides */
  across: number
  down: number
  /** how many pixels deep the wear goes at most (default 2) */
  wear?: 1 | 2
}

/**
 * The sheet's outline, in pixel steps: square corners, the dog-ear cut off the top right as a staircase, and its edges worn as old paper's:
 * along each edge, runs of the paper's pixels, some a pixel in (now and then two)
 */
export function paperOutline({ px, fold, seed, across, down, wear = 2 }: Sheet) {
  const next = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
  const depth = () => (next() < 0.06 ? wear * px : next() < 0.3 ? px : 0)
  // n runs along an edge: each run's start and end (fractions of the edge) and how far in it is worn
  const runs = (n: number) => Array.from({ length: n }, (_, i) => ({ from: i / n, to: (i + 1) / n, d: depth() }))
  const pts: string[] = []
  // top, left to right, up to the dog-ear
  for (const r of runs(across)) pts.push(`calc(${r.from * 100}% - ${r.from * fold}px) ${r.d}px`, `calc(${r.to * 100}% - ${r.to * fold}px) ${r.d}px`)
  // the dog-ear's staircase, from the top edge down to the right edge
  for (let k = 0; k < fold / px; k++) pts.push(`calc(100% - ${fold - (k + 1) * px}px) ${k * px}px`, `calc(100% - ${fold - (k + 1) * px}px) ${(k + 1) * px}px`)
  // right, top to bottom
  for (const r of runs(down)) pts.push(`calc(100% - ${r.d}px) calc(${fold * (1 - r.from)}px + ${r.from * 100}%)`, `calc(100% - ${r.d}px) calc(${fold * (1 - r.to)}px + ${r.to * 100}%)`)
  // bottom, right to left
  for (const r of runs(across + 2)) pts.push(`${(1 - r.from) * 100}% calc(100% - ${r.d}px)`, `${(1 - r.to) * 100}% calc(100% - ${r.d}px)`)
  // left, bottom to top
  for (const r of runs(down)) pts.push(`${r.d}px ${(1 - r.from) * 100}%`, `${r.d}px ${(1 - r.to) * 100}%`)
  return `polygon(${pts.join(', ')})`
}

/** The dog-ear: the folded-over corner's back lying on the sheet below the fold, the staircase under the cut (for a fold × fold box at the top right) */
export function dogEar(px: number, fold: number) {
  const pts = ['0 0']
  for (let k = 0; k < fold / px; k++) pts.push(`${(k + 1) * px}px ${k * px}px`, `${(k + 1) * px}px ${(k + 1) * px}px`)
  pts.push(`0 ${fold}px`)
  return `polygon(${pts.join(', ')})`
}

/** Age on the sheet: a few faint brown stains near its edges and corners, over its colour */
export const PAPER_STAINS = [
  'radial-gradient(ellipse 90px 40px at 6% 92%, rgb(110 80 45 / 0.22), transparent 70%)',
  'radial-gradient(ellipse 70px 30px at 38% 4%, rgb(110 80 45 / 0.14), transparent 70%)',
  'radial-gradient(ellipse 120px 45px at 82% 100%, rgb(110 80 45 / 0.18), transparent 70%)',
  'radial-gradient(circle 26px at 97% 55%, rgb(110 80 45 / 0.16), transparent 70%)',
].join(', ')

/** A border a pixel wide all round a clipped shape (four hard drop shadows follow what is clipped): for the clipped sheet's wrapper */
export const pixelOutline = (px: number, colour: string) =>
  `drop-shadow(${px}px 0 0 ${colour}) drop-shadow(-${px}px 0 0 ${colour}) drop-shadow(0 ${px}px 0 ${colour}) drop-shadow(0 -${px}px 0 ${colour})`

/** The text colours on the sheet, as CSS variables for what is in it (the theme's, and Tailwind's, which are read at :root, so set both) */
export const PARCHMENT_INK = {
  '--fg': PARCHMENT.fg,
  '--fg-subtle': PARCHMENT.subtle,
  '--fg-muted': PARCHMENT.muted,
  '--line': PARCHMENT.line,
  '--color-fg': PARCHMENT.fg,
  '--color-fg-subtle': PARCHMENT.subtle,
  '--color-fg-muted': PARCHMENT.muted,
  '--color-line': PARCHMENT.line,
} as const
