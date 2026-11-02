// The cracked edge of a CrackedPanel, in px for its measured size, so the cracks are as close together on its short sides as on its long ones
// (paperEdge.ts' cards spread the same number over every side). Pure (crackedEdge.test.ts).
import { seededRandom } from '../../../lib/seededRandom'

const round = (v: number) => Math.round(v * 10) / 10

/** One side `len` px long: points along it (px from its start) and how far in each is (px): an uneven edge with `count` V-shaped cracks in it */
function side(next: () => number, len: number, count: number, depth: number): { t: number; d: number }[] {
  const deckle = Math.min(1.4, depth * 0.25)
  const nicks: { t: number; width: number; skew: number; deep: number }[] = []
  for (let tries = 0; nicks.length < count && tries < 80; tries++) {
    const width = 5 + next() * 8
    const t = 6 + next() * Math.max(0, len - 12 - width)
    if (nicks.some((n) => t < n.t + n.width + 10 && t + width + 10 > n.t)) continue
    nicks.push({ t, width, skew: 0.2 + next() * 0.6, deep: depth * (0.4 + next() * 0.6) })
  }
  const inNick = (t: number) => nicks.some((n) => t > n.t - 1 && t < n.t + n.width + 1)
  const points: { t: number; d: number }[] = []
  for (let at = 0; at < len; at += 5) {
    const t = at === 0 ? 0 : Math.min(len, at + (next() - 0.5) * 2)
    if (!inNick(t)) points.push({ t: round(t), d: round(next() * deckle) })
  }
  for (const n of nicks) {
    points.push({ t: round(n.t), d: round(next() * deckle) })
    points.push({ t: round(n.t + n.width * n.skew), d: round(n.deep) })
    points.push({ t: round(n.t + n.width), d: round(next() * deckle) })
  }
  return points.sort((a, b) => a.t - b.t)
}

/**
 * A CSS polygon for a `w`×`h` px box: `cuts` cracks along the top and along the bottom, and as many on the left and right as the same density
 * gives them (fewer on a short side, none on a very short one); `depth` px the deepest; a `straight` side has none. The same seed and size give
 * the same edge
 */
export function crackedEdge(seed: string, w: number, h: number, cuts: number, depth: number, straight: { left?: boolean; right?: boolean } = {}): string {
  if (w <= 0 || h <= 0) return 'none'
  const next = seededRandom(seed)
  const perPx = cuts / w
  const sideCuts = Math.round(perPx * h)
  // A straight side (where a roll covers it): its two ends only
  const flat = (len: number) => [{ t: 0, d: 0 }, { t: len, d: 0 }]
  const top = side(next, w, cuts, depth).map((p) => `${p.t}px ${p.d}px`)
  const rightSide = side(next, h, sideCuts, depth)
  const right = (straight.right ? flat(h) : rightSide).map((p) => `${round(w - p.d)}px ${p.t}px`)
  const bottom = side(next, w, cuts, depth).map((p) => `${round(w - p.t)}px ${round(h - p.d)}px`)
  const leftSide = side(next, h, sideCuts, depth)
  const left = (straight.left ? flat(h) : leftSide).map((p) => `${p.d}px ${round(h - p.t)}px`)
  return `polygon(${[...top, ...right, ...bottom, ...left].join(', ')})`
}
