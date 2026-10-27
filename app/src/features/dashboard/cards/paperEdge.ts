// The edge of a map card, like old paper: a little uneven all along, with a few small cuts into it, V-shaped and each its own size. One polygon
// for `clip-path`, from a seed (the card's id), so a card has the same edges every time. Pure (paperEdge.test.ts).
import { random } from './crack'

// ── The two numbers to change ────────────────────────────────────────────────────────────────────────────────────────────────────
/** How many small cuts each side has */
export const PAPER_CUTS = 3
/** How deep the deepest cut goes into the card, in px (the edge's own unevenness is a quarter of it, at most 1.4px) */
export const PAPER_DEPTH = 6
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const round = (value: number) => Math.round(value * 10) / 10

/** A point of a side: how far along it (% from its start) and how far in from it (px) */
type Point = { t: number; d: number }

/** One side, from its first corner to just before the next: its uneven edge, with the cuts in it */
function side(next: () => number, cuts: number, depth: number): Point[] {
  const deckle = Math.min(1.4, depth * 0.25)
  // Where the cuts are: away from the corners and from each other
  const nicks: { t: number; width: number; skew: number; deep: number }[] = []
  for (let tries = 0; nicks.length < cuts && tries < 60; tries++) {
    const t = 6 + next() * 86
    const width = 1.8 + next() * 2.7
    if (nicks.some((n) => t < n.t + n.width + 8 && t + width + 8 > n.t)) continue
    // `skew`: where the deepest point is across the cut, so they lean one way or the other
    nicks.push({ t, width, skew: 0.2 + next() * 0.6, deep: depth * (0.4 + next() * 0.6) })
  }
  const inNick = (t: number) => nicks.some((n) => t > n.t - 0.8 && t < n.t + n.width + 0.8)
  const points: Point[] = []
  // The edge between the cuts: a point every few percent, each a little off its even place and a little in
  for (let at = 0; at < 100; at += 3.5) {
    const t = at === 0 ? 0 : at + (next() - 0.5) * 1.6
    if (!inNick(t)) points.push({ t: round(t), d: round(next() * deckle) })
  }
  for (const n of nicks) {
    points.push({ t: round(n.t), d: round(next() * deckle) })
    points.push({ t: round(n.t + n.width * n.skew), d: round(n.deep) })
    points.push({ t: round(n.t + n.width), d: round(next() * deckle) })
  }
  return points.sort((a, b) => a.t - b.t)
}

/** A CSS `polygon(...)` for `clip-path`: the four sides, clockwise from the top left, each as `side` makes it */
export function paperEdgePolygon(seed: string, cuts = PAPER_CUTS, depth = PAPER_DEPTH): string {
  const next = random(seed)
  const fromEnd = (px: number) => `calc(100% - ${px}px)`
  const top = side(next, cuts, depth).map((p) => `${p.t}% ${p.d}px`)
  const right = side(next, cuts, depth).map((p) => `${fromEnd(p.d)} ${p.t}%`)
  const bottom = side(next, cuts, depth).map((p) => `${round(100 - p.t)}% ${fromEnd(p.d)}`)
  const left = side(next, cuts, depth).map((p) => `${p.d}px ${round(100 - p.t)}%`)
  return `polygon(${[...top, ...right, ...bottom, ...left].join(', ')})`
}
