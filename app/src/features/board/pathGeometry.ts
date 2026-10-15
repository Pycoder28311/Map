// An object's outline as a polyline, and a polyline with its corners rounded. Pure (pathGeometry.test.ts).
import { flatten } from './bezier'
import { shapeOutline } from './shapes'
import type { BoardObject, Point } from './types'

const cache = new WeakMap<BoardObject, Point[]>()

/** The outline the object is painted, hit and measured by. Objects are immutable, so each one is worked out once */
export function flattenedOf(o: BoardObject): Point[] {
  const known = cache.get(o)
  if (known) return known
  let out: Point[]
  switch (o.kind) {
    case 'line':
      out = flatten(o.points, o.handles, false)
      break
    case 'border':
      out = flatten(o.points, o.handles, true)
      break
    case 'shape':
      out = shapeOutline(o.shape, o.box, o.rotation, o.param)
      break
    default:
      out = [o.anchor]
  }
  cache.set(o, out)
  return out
}

/** Whether the outline is a ring (its last point joins its first) */
export const isClosed = (o: BoardObject) => o.kind === 'shape' || (o.kind === 'border' && !o.open)

const CORNER_STEPS = 6

/**
 * The polyline with each corner cut by a curve (exact lines' softness, 0–100). The ends stay where they are; 0 is the
 * input itself. A corner is cut at most `amount / 200` of its shorter side from the corner, so neighbours never overlap.
 */
export function softened(polyline: Point[], amount: number, closed = false): Point[] {
  if (amount <= 0 || polyline.length < 3) return polyline
  const share = Math.min(100, amount) / 200
  const n = polyline.length
  const out: Point[] = []
  const corner = (i: number) => {
    const v = polyline[i]
    const prev = polyline[(i - 1 + n) % n]
    const next = polyline[(i + 1) % n]
    const l1 = Math.hypot(prev.x - v.x, prev.y - v.y)
    const l2 = Math.hypot(next.x - v.x, next.y - v.y)
    if (l1 === 0 || l2 === 0) {
      out.push(v)
      return
    }
    const d = share * Math.min(l1, l2)
    const a = { x: v.x + ((prev.x - v.x) / l1) * d, y: v.y + ((prev.y - v.y) / l1) * d }
    const b = { x: v.x + ((next.x - v.x) / l2) * d, y: v.y + ((next.y - v.y) / l2) * d }
    for (let s = 0; s <= CORNER_STEPS; s++) {
      const t = s / CORNER_STEPS
      const u = 1 - t
      out.push({ x: u * u * a.x + 2 * u * t * v.x + t * t * b.x, y: u * u * a.y + 2 * u * t * v.y + t * t * b.y })
    }
  }
  if (!closed) out.push(polyline[0])
  for (let i = closed ? 0 : 1; i < (closed ? n : n - 1); i++) corner(i)
  if (!closed) out.push(polyline[n - 1])
  return out
}

/** The length of a polyline */
export function lengthOf(polyline: Point[]) {
  let sum = 0
  for (let i = 1; i < polyline.length; i++) sum += Math.hypot(polyline[i].x - polyline[i - 1].x, polyline[i].y - polyline[i - 1].y)
  return sum
}

/** The polyline shortened by `start` at its first end and `end` at its last (unchanged when that would leave nothing) */
export function trimEnds(polyline: Point[], start: number, end: number): Point[] {
  if (polyline.length < 2 || (start <= 0 && end <= 0) || lengthOf(polyline) <= start + end + 0.5) return polyline
  const cut = (points: Point[], by: number) => {
    if (by <= 0) return points
    let left = by
    for (let i = 1; i < points.length; i++) {
      const l = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
      if (l > left) {
        const t = left / l
        return [{ x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t }, ...points.slice(i)]
      }
      left -= l
    }
    return points
  }
  return cut(cut(polyline, start).slice().reverse(), end).slice().reverse()
}
