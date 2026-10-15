// A drawn stroke, a set of clicked corners or a dragged shape becomes a border (ready for mergeBorders / addObject).
// Pure (drawBorder.test.ts).
import { simplify } from '../projects/strokeCodec'
import { canSelect } from './layers'
import { flattenedOf } from './pathGeometry'
import { snapToRing } from './polygon'
import { shapeOutline } from './shapes'
import { LAYER_MAIN, type Board, type BorderObject, type Fill, type Point, type ShapeType, type Style } from './types'

/** The inside an area starts with: its border's colour, lightly */
export const defaultFill = (style: Style): Fill => ({ color: style.color, opacity: 20 })

/** A last point this close to the first closes the border by itself instead of being a point of it */
const CLOSE = 3

type Made = Omit<BorderObject, 'id'>

/**
 * The border from its points: whole numbers, no point twice in a row. A last point within `closeWithin` of the first closes it
 * (and is not a point of it); `closed` says it for the ones that are closed by what they are (a shape) or by a click (a linear
 * border). Otherwise the ends are not joined and it is an open border, a line.
 */
const make = (points: Point[], style: Style, fill: Fill | null, closed: boolean | 'auto', closeWithin = CLOSE): Made | null => {
  const ring: Point[] = []
  for (const p of points) {
    const q = { x: Math.round(p.x), y: Math.round(p.y) }
    const last = ring[ring.length - 1]
    if (!last || last.x !== q.x || last.y !== q.y) ring.push(q)
  }
  const joined = ring.length > 2 && Math.hypot(ring[0].x - ring[ring.length - 1].x, ring[0].y - ring[ring.length - 1].y) <= closeWithin
  if (joined) ring.pop()
  const isClosed = closed === 'auto' ? joined : closed
  const base = { kind: 'border' as const, layer: LAYER_MAIN, name: '', links: [], style, fill, description: '' }
  if (isClosed) return ring.length < 3 ? null : { ...base, points: ring }
  // Open: it needs to go somewhere (a dot or a scribble in one place is nothing)
  if (ring.length < 2 || Math.max(...ring.map((p) => Math.hypot(p.x - ring[0].x, p.y - ring[0].y))) <= CLOSE) return null
  return { ...base, points: ring, open: true }
}

/** The mouse-like way: the path of the pointer. Its ends are joined only when it comes back within `closeWithin` of where it started */
export function borderFromStroke(stroke: Point[], style: Style, fill: Fill | null, closeWithin = CLOSE): Made | null {
  return make(simplify(stroke, 1), { ...style, way: 'exact' }, fill, 'auto', closeWithin)
}

/** The linear way: the corners clicked, in order; `closed`: the first corner was clicked again, so the ends are joined */
export function borderFromCorners(corners: Point[], style: Style, fill: Fill | null, closed = false): Made | null {
  return make(corners, { ...style, way: 'straight', amount: 0 }, fill, closed)
}

/** The shape way: the shape's outline in the box (its points can be edited like any linear border) */
export function borderFromShape(box: { x: number; y: number; w: number; h: number }, shape: ShapeType, param: number, style: Style, fill: Fill | null): Made | null {
  return make(shapeOutline(shape, box, 0, param), { ...style, way: 'straight', amount: 0 }, fill, true)
}

/** The points moved onto the nearest border's corner or edge when one is within `tolerance` (board units) */
export function snapToBorders(points: Point[], board: Board, tolerance: number): Point[] {
  const rings = board.objects.filter((o) => o.kind === 'border' && !o.open && canSelect(o)).map((o) => flattenedOf(o))
  return points.map((p) => {
    let best = p
    let bestDistance = Infinity
    for (const ring of rings) {
      const snapped = snapToRing(p, ring, tolerance)
      if (!snapped) continue
      const d = Math.hypot(snapped.x - p.x, snapped.y - p.y)
      if (d < bestDistance) {
        best = snapped
        bestDistance = d
      }
    }
    return best
  })
}
