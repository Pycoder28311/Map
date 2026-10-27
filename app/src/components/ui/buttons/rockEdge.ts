// The rocky border of the Stone buttons (the `secondary` variant): its face is cut to a polygon whose sides are a row of points, each a little in
// from where a straight edge would be, so the border is not a straight line. One polygon for every Stone button, set once as the CSS
// variable --btn-rock (applyRockEdge, from main.tsx); styles/buttons.css cuts the face to it. Pure (rockEdge.test.ts).
import { seededRandom } from '../../../lib/seededRandom'

// ── The two numbers to change ────────────────────────────────────────────────────────────────────────────────────────────────────
/** How many points the border has along its long sides, where it changes direction (1 to 40); the short sides get 40% of it, at least 2 */
export const ROCK_POINTS = 12
/** How rough the border is: how far in from a straight edge a point can be, in px (0 is a straight border) */
export const ROCK_INTENSITY = 0.5
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

const round = (value: number) => Math.round(value * 10) / 10

/** A CSS `polygon(...)` for `clip-path`: the four sides, clockwise from the top left, each point `intensity` px in from its edge at the most */
export function rockPolygon(seed = 'stone', points = ROCK_POINTS, intensity = ROCK_INTENSITY): string {
  const next = seededRandom(seed)
  const across = Math.round(Math.min(40, Math.max(1, points)))
  const down = Math.max(2, Math.round(across * 0.4))
  const depth = () => round(next() * Math.max(0, intensity))
  // Along a side: point `k` of `count`, the inner ones a little off their even places
  const along = (k: number, count: number) => (k === 0 ? 0 : round(((k + (next() - 0.5) * 0.7) / count) * 100))
  const fromEnd = (px: number) => `calc(100% - ${px}px)`
  const polygon: string[] = []
  for (let k = 0; k < across; k++) polygon.push(`${along(k, across)}% ${depth()}px`) // top, to the right
  for (let k = 0; k < down; k++) polygon.push(`${fromEnd(depth())} ${along(k, down)}%`) // right, down
  for (let k = 0; k < across; k++) polygon.push(`${round(100 - along(k, across))}% ${fromEnd(depth())}`) // bottom, to the left
  for (let k = 0; k < down; k++) polygon.push(`${depth()}px ${round(100 - along(k, down))}%`) // left, up
  return `polygon(${polygon.join(', ')})`
}


/** Sets --btn-rock, the polygon the Stone buttons' faces are cut to (styles/buttons.css). Once, before the first render */
export function applyRockEdge(root: HTMLElement = document.documentElement) {
  root.style.setProperty('--btn-rock', rockPolygon())
}
