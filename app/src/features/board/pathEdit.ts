// Editing a line's points and curve handles on the map (Figma-like). Pure (pathEdit.test.ts).
import type { Patch } from './changes'
import { edgeColours, edgeRuns } from './borders'
import { distanceToSegment } from './hit'
import type { BorderObject, Handle, LineObject, Point } from './types'

/** What the point editor needs of a line or a border */
type PathLike = { points: Point[]; handles?: Handle[] }

export type PathRef = { kind: 'point' | 'in' | 'out'; index: number }

const whole = (n: number) => Math.round(n) || 0
const NONE: Handle = { inX: 0, inY: 0, outX: 0, outY: 0 }

/** Where a point's curve knobs are (board units); null when the line has no handles */
export function knobsOf(line: PathLike, index: number): { in: Point; out: Point } | null {
  const h = line.handles?.[index]
  const p = line.points[index]
  if (!h || !p) return null
  return { in: { x: p.x + h.inX, y: p.y + h.inY }, out: { x: p.x + h.outX, y: p.y + h.outY } }
}

/**
 * What is at `p`: a knob of point `active` first (they sit on top), then a point. `tolerance` is in board units.
 * A knob with no length (a straight side) is not there.
 */
export function hitPathPoint(line: PathLike, p: Point, tolerance: number, active: number | null): PathRef | null {
  const near = (q: Point) => Math.hypot(p.x - q.x, p.y - q.y) <= tolerance
  if (active !== null) {
    const knobs = knobsOf(line, active)
    const h = line.handles?.[active]
    if (knobs && h) {
      if ((h.outX || h.outY) && near(knobs.out)) return { kind: 'out', index: active }
      if ((h.inX || h.inY) && near(knobs.in)) return { kind: 'in', index: active }
    }
  }
  // The last of any that overlap is on top, as painted
  for (let i = line.points.length - 1; i >= 0; i--) if (near(line.points[i])) return { kind: 'point', index: i }
  return null
}

/** Point `index` moved to `to` (its handles are offsets, so they go with it) */
export function movePoint(line: PathLike, index: number, to: Point): Patch {
  const points = line.points.map((p, i) => (i === index ? { x: whole(to.x), y: whole(to.y) } : p))
  return { points }
}

/**
 * A knob dragged to `to`. `mirror`: the other side turns the opposite way (a smooth point); only where the point has a
 * line on both sides, since an end's free side has no curve to keep smooth.
 */
export function moveHandle(line: PathLike, index: number, side: 'in' | 'out', to: Point, mirror: boolean): Patch {
  const p = line.points[index]
  const dx = whole(to.x - p.x)
  const dy = whole(to.y - p.y)
  const handles = (line.handles ?? line.points.map(() => NONE)).map((h, i) => {
    if (i !== index) return h
    const both = index > 0 && index < line.points.length - 1
    if (side === 'out') return { ...h, outX: dx, outY: dy, ...(mirror && both ? { inX: -dx, inY: -dy } : {}) }
    return { ...h, inX: dx, inY: dy, ...(mirror && both ? { outX: -dx, outY: -dy } : {}) }
  })
  return { handles }
}

/** The least points a path keeps: a ring needs three, a line two */
export const minPoints = (o: LineObject | BorderObject) => (o.kind === 'border' && !o.open ? 3 : 2)

/** The path without point `index` (its handle and edge colour go with it); null when it would be left with too few points */
export function removePoint(o: LineObject | BorderObject, index: number): Patch | null {
  if (index < 0 || index >= o.points.length || o.points.length <= minPoints(o)) return null
  const patch: Patch = { points: o.points.filter((_, i) => i !== index) }
  if (o.handles) patch.handles = o.handles.filter((_, i) => i !== index)
  if (o.kind === 'border' && o.edges?.length) {
    const runs = edgeRuns(edgeColours(o).filter((_, i) => i !== index), o.style.color)
    patch.edges = runs.length ? runs : undefined
  }
  return patch
}

/** The path with a new point at `to` as point `index` (the others after it move on): its handle is none, its edge has the colour of the one it splits */
export function insertPoint(o: LineObject | BorderObject, index: number, to: Point): Patch {
  const at = { x: whole(to.x), y: whole(to.y) }
  const patch: Patch = { points: [...o.points.slice(0, index), at, ...o.points.slice(index)] }
  if (o.handles) patch.handles = [...o.handles.slice(0, index), NONE, ...o.handles.slice(index)]
  if (o.kind === 'border' && o.edges?.length) {
    const colours = edgeColours(o)
    const runs = edgeRuns([...colours.slice(0, index), colours[Math.max(0, index - 1)], ...colours.slice(index)], o.style.color)
    patch.edges = runs.length ? runs : undefined
  }
  return patch
}

/** Where a click on the path's side puts a new point: the index it gets and the nearest spot on that side (the corners are joined by straight sides) */
export function pointOnSide(o: LineObject | BorderObject, p: Point): { index: number; at: Point } | null {
  const n = o.points.length
  const closed = o.kind === 'border' && !o.open
  let best: { index: number; at: Point } | null = null
  let bestDistance = Infinity
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = o.points[i]
    const b = o.points[(i + 1) % n]
    const d = distanceToSegment(p, a, b)
    if (d >= bestDistance) continue
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = dx * dx + dy * dy
    const t = len === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
    best = { index: i + 1, at: { x: a.x + t * dx, y: a.y + t * dy } }
    bestDistance = d
  }
  return best
}

/** Where a new point goes when the path is continued from point `picked`: after it, or before it when it is the first end of a line */
export const continueIndex = (o: LineObject | BorderObject, picked: number) => (o.kind === 'border' && !o.open ? picked + 1 : picked === 0 && o.points.length > 1 ? 0 : picked + 1)
