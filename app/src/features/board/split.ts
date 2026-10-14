// Cutting a line in two. Pure (split.test.ts).
import { cubicOf, nearestOnCurve, splitCubic } from './bezier'
import type { Draft } from './changes'
import type { BorderObject, Handle, LineObject, Point } from './types'

/** The nearest place on a path to `p`: the segment (from point `segment`), how far along it (0–1) and the place */
export function nearestOnPath(points: Point[], p: Point) {
  let best = { segment: 0, t: 0, point: points[0], distance: Infinity }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
    const point = { x: a.x + t * dx, y: a.y + t * dy }
    const distance = Math.hypot(p.x - point.x, p.y - point.y)
    if (distance < best.distance) best = { segment: i, t, point, distance }
  }
  return best
}

const NO_HANDLE: Handle = { inX: 0, inY: 0, outX: 0, outY: 0 }
const whole = (n: number) => Math.round(n) || 0

/**
 * The line cut at the place nearest `p`, as two new lines (same style, links, name and layer), or null when that is an
 * end of the line (nothing to cut) or the line is one point. A place between two points becomes a point of both halves;
 * on a curve the curve is cut there (de Casteljau), so both halves keep its shape.
 */
export function splitLine(line: LineObject, p: Point): [Draft & { kind: 'line' }, Draft & { kind: 'line' }] | null {
  const { points, handles } = line
  if (points.length < 2) return null
  const near = nearestOnCurve(points, handles, p)
  const rounded = { x: Math.round(near.point.x), y: Math.round(near.point.y) }
  let cut: number
  let cutPoints = points
  let cutHandles = handles
  const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y
  if (same(rounded, points[near.segment])) cut = near.segment
  else if (same(rounded, points[near.segment + 1])) cut = near.segment + 1
  else {
    cut = near.segment + 1
    const cubic = cubicOf(points, handles, near.segment)
    let before = NO_HANDLE
    let after = NO_HANDLE
    if (cubic && handles) {
      const [left, right] = splitCubic(cubic, near.t)
      const m = rounded
      before = { inX: whole(left[2].x - m.x), inY: whole(left[2].y - m.y), outX: 0, outY: 0 }
      after = { inX: 0, inY: 0, outX: whole(right[1].x - m.x), outY: whole(right[1].y - m.y) }
      const a = handles[near.segment]
      const d = handles[cut]
      cutHandles = [
        ...handles.slice(0, near.segment),
        { ...a, outX: whole(left[1].x - cubic[0].x), outY: whole(left[1].y - cubic[0].y) },
        // The new point is two points (one per half) that sit together; the halves are cut from this list below
        before,
        after,
        { ...d, inX: whole(right[2].x - cubic[3].x), inY: whole(right[2].y - cubic[3].y) },
        ...handles.slice(cut + 1),
      ]
      cutPoints = [...points.slice(0, cut), rounded, rounded, ...points.slice(cut)]
      return [halfOf(line, cutPoints.slice(0, cut + 1), cutHandles.slice(0, cut + 1)), halfOf(line, cutPoints.slice(cut + 1), cutHandles.slice(cut + 1))]
    }
    cutPoints = [...points.slice(0, cut), rounded, ...points.slice(cut)]
    cutHandles = handles && [...handles.slice(0, cut), NO_HANDLE, ...handles.slice(cut)]
  }
  if (cut <= 0 || cut >= cutPoints.length - 1) return null
  return [halfOf(line, cutPoints.slice(0, cut + 1), cutHandles?.slice(0, cut + 1)), halfOf(line, cutPoints.slice(cut), cutHandles?.slice(cut))]
}

function halfOf(line: LineObject, points: Point[], handles?: Handle[]): Draft & { kind: 'line' } {
  const { id, handles: _handles, ...rest } = line
  void id
  void _handles
  return { ...rest, points, ...(handles ? { handles } : {}) }
}

/**
 * A border cut open at the place nearest `p`: a line (same style, links, name and layer) that starts and ends there and
 * runs round the outline in between. A place between two points becomes the line's two ends.
 */
export function splitBorder(border: BorderObject, p: Point): (Draft & { kind: 'line' }) | null {
  const { points } = border
  if (points.length < 3) return null
  const near = nearestOnPath([...points, points[0]], p)
  const cut = { x: Math.round(near.point.x), y: Math.round(near.point.y) }
  const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y
  const n = points.length
  const i = near.segment
  let run: Point[]
  if (same(cut, points[i])) run = [...points.slice(i), ...points.slice(0, i), points[i]]
  else if (same(cut, points[(i + 1) % n])) run = [...points.slice((i + 1) % n), ...points.slice(0, (i + 1) % n), points[(i + 1) % n]]
  else run = [cut, ...points.slice(i + 1), ...points.slice(0, i + 1), cut]
  return lineFromBorder(border, run)
}

/** The line an area becomes when it is opened or erased: same layer, name, links and style, no inside */
export function lineFromBorder(border: BorderObject, points: Point[]): Draft & { kind: 'line' } {
  return { kind: 'line', layer: border.layer, name: border.name, links: border.links, style: border.style, points }
}
