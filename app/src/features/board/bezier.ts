// Curves of a path: points with optional handles (Figma vectors) as a polyline, cut and searched. Pure (bezier.test.ts).
import type { Handle, Point } from './types'

const STEPS_MIN = 4
const STEPS_MAX = 32
/** About one step per this many board units of the control polygon */
const STEP_LENGTH = 6

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })

export type Cubic = [Point, Point, Point, Point]

/** The cubic between point `i` and the next (wrapping when `closed`), or null when that segment is straight */
export function cubicOf(points: Point[], handles: Handle[] | undefined, i: number): Cubic | null {
  const j = (i + 1) % points.length
  const a = points[i]
  const d = points[j]
  const ha = handles?.[i]
  const hd = handles?.[j]
  if (!ha && !hd) return null
  if (!(ha?.outX || ha?.outY || hd?.inX || hd?.inY)) return null
  return [a, { x: a.x + (ha?.outX ?? 0), y: a.y + (ha?.outY ?? 0) }, { x: d.x + (hd?.inX ?? 0), y: d.y + (hd?.inY ?? 0) }, d]
}

export function cubicAt([a, b, c, d]: Cubic, t: number): Point {
  const ab = lerp(a, b, t)
  const bc = lerp(b, c, t)
  const cd = lerp(c, d, t)
  return lerp(lerp(ab, bc, t), lerp(bc, cd, t), t)
}

/** The cubic cut at `t` (de Casteljau): the two halves */
export function splitCubic(cubic: Cubic, t: number): [Cubic, Cubic] {
  const [a, b, c, d] = cubic
  const ab = lerp(a, b, t)
  const bc = lerp(b, c, t)
  const cd = lerp(c, d, t)
  const abc = lerp(ab, bc, t)
  const bcd = lerp(bc, cd, t)
  const m = lerp(abc, bcd, t)
  return [[a, ab, abc, m], [m, bcd, cd, d]]
}

const stepsOf = (cubic: Cubic) => {
  const length = Math.hypot(cubic[1].x - cubic[0].x, cubic[1].y - cubic[0].y) + Math.hypot(cubic[2].x - cubic[1].x, cubic[2].y - cubic[1].y) + Math.hypot(cubic[3].x - cubic[2].x, cubic[3].y - cubic[2].y)
  return Math.min(STEPS_MAX, Math.max(STEPS_MIN, Math.ceil(length / STEP_LENGTH)))
}

/**
 * The path as a polyline. Straight segments stay one step; a curved one is sampled (the ends are exact). A closed path
 * includes its closing segment and does not repeat the first point at the end.
 */
export function flatten(points: Point[], handles?: Handle[], closed = false): Point[] {
  if (points.length < 2) return points
  const out: Point[] = [points[0]]
  const count = closed && points.length > 2 ? points.length : points.length - 1
  for (let i = 0; i < count; i++) {
    const cubic = cubicOf(points, handles, i)
    const end = points[(i + 1) % points.length]
    if (cubic) {
      const steps = stepsOf(cubic)
      for (let s = 1; s < steps; s++) out.push(cubicAt(cubic, s / steps))
    }
    if (!(closed && i === count - 1)) out.push(end)
  }
  return out
}

/** The nearest place on the curve to `p`: the segment (from point `segment`), how far along it (0–1), the place, the distance */
export function nearestOnCurve(points: Point[], handles: Handle[] | undefined, p: Point) {
  let best = { segment: 0, t: 0, point: points[0], distance: Infinity }
  for (let i = 0; i < points.length - 1; i++) {
    const cubic = cubicOf(points, handles, i)
    const steps = cubic ? stepsOf(cubic) * 4 : 1
    const at = (t: number) => (cubic ? cubicAt(cubic, t) : lerp(points[i], points[i + 1], t))
    // Straight: exact projection. Curved: the nearest sample, then a finer pass around it
    if (!cubic) {
      const a = points[i]
      const b = points[i + 1]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const l2 = dx * dx + dy * dy
      const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
      const point = at(t)
      const distance = Math.hypot(p.x - point.x, p.y - point.y)
      if (distance < best.distance) best = { segment: i, t, point, distance }
      continue
    }
    let bestT = 0
    let bestD = Infinity
    for (let s = 0; s <= steps; s++) {
      const q = at(s / steps)
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      if (d < bestD) {
        bestD = d
        bestT = s / steps
      }
    }
    for (let s = -8; s <= 8; s++) {
      const t = Math.min(1, Math.max(0, bestT + s / (steps * 8)))
      const q = at(t)
      const d = Math.hypot(p.x - q.x, p.y - q.y)
      if (d < bestD) {
        bestD = d
        bestT = t
      }
    }
    if (bestD < best.distance) best = { segment: i, t: bestT, point: at(bestT), distance: bestD }
  }
  return best
}

/** Smooth handles through the points (Catmull-Rom). The two ends have none on their free side */
export function autoHandles(points: Point[]): Handle[] {
  return points.map((p, i) => {
    const prev = points[i - 1]
    const next = points[i + 1]
    if (!prev && !next) return { inX: 0, inY: 0, outX: 0, outY: 0 }
    const dx = ((next ?? p).x - (prev ?? p).x) / 6
    const dy = ((next ?? p).y - (prev ?? p).y) / 6
    const round = (n: number) => Math.round(n) || 0
    return { inX: prev ? round(-dx) : 0, inY: prev ? round(-dy) : 0, outX: next ? round(dx) : 0, outY: next ? round(dy) : 0 }
  })
}
