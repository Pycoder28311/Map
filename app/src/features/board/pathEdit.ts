// Editing a line's points and curve handles on the map (Figma-like). Pure (pathEdit.test.ts).
import type { Patch } from './changes'
import type { Handle, Point } from './types'

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
