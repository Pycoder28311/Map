// What is under a point, or inside a rectangle. Pure (hit.test.ts).
import { boundsIntersect, boundsOf, shapeCorners, textBox, type Rect } from './bounds'
import { containsPoint } from './polygon'
import { canSelect, drawOrder } from './layers'
import { flattenedOf } from './pathGeometry'
import type { Board, BoardObject, Point } from './types'

/** How far `p` is from the segment a–b */
export function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  const t = lengthSquared === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** The segments of a path (a border also closes last to first) */
export function segmentsOf(points: Point[], closed: boolean): [Point, Point][] {
  if (points.length === 1) return [[points[0], points[0]]]
  const segments = points.slice(1).map((p, i) => [points[i], p] as [Point, Point])
  if (closed && points.length > 2) segments.push([points[points.length - 1], points[0]])
  return segments
}

const inside = (r: Rect, p: Point) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

/** Where on an object a point is: on its outline (`edge`) or, for an area, anywhere `inside` it. Null when it is not on it */
export type Part = 'edge' | 'inside'

/** What part of the object `p` is on (`tolerance`: board units of slack, so thin things can be hit) */
export function hitPart(o: BoardObject, p: Point, tolerance: number): Part | null {
  switch (o.kind) {
    case 'line':
      return segmentsOf(flattenedOf(o), false).some(([a, b]) => distanceToSegment(p, a, b) <= Math.max(o.style.thickness / 2, tolerance)) ? 'edge' : null
    case 'border': {
      const ring = flattenedOf(o)
      const reach = Math.max(o.style.thickness / 2, tolerance)
      if (segmentsOf(ring, !o.open).some(([a, b]) => distanceToSegment(p, a, b) <= reach)) return 'edge'
      return !o.open && containsPoint(ring, p) ? 'inside' : null
    }
    case 'shape': {
      const outline = flattenedOf(o)
      const reach = Math.max(o.style.thickness / 2, tolerance)
      return containsPoint(outline, p) || segmentsOf(outline, true).some(([a, b]) => distanceToSegment(p, a, b) <= reach) ? 'edge' : null
    }
    case 'text': {
      const corners = shapeCorners(textBox(o), o.rotation)
      return containsPoint(corners, p) || segmentsOf(corners, true).some(([a, b]) => distanceToSegment(p, a, b) <= tolerance) ? 'edge' : null
    }
    case 'point': {
      const r = boundsOf(o)
      return inside({ x: r.x - tolerance, y: r.y - tolerance, w: r.w + 2 * tolerance, h: r.h + 2 * tolerance }, p) ? 'edge' : null
    }
  }
}

/** Whether `p` is on the object */
export const hitObject = (o: BoardObject, p: Point, tolerance: number) => hitPart(o, p, tolerance) !== null

/** The topmost selectable object at `p` */
export function hitTest(board: Board, p: Point, tolerance: number): BoardObject | null {
  return hitTestPart(board, p, tolerance)?.object ?? null
}

/** The topmost selectable object at `p` and which part of it is there */
export function hitTestPart(board: Board, p: Point, tolerance: number): { object: BoardObject; part: Part } | null {
  const order = drawOrder(board)
  for (let i = order.length - 1; i >= 0; i--) {
    if (!canSelect(order[i])) continue
    const part = hitPart(order[i], p, tolerance)
    if (part) return { object: order[i], part }
  }
  return null
}

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const segmentsCross = (a: Point, b: Point, c: Point, d: Point) => cross(a, b, c) * cross(a, b, d) <= 0 && cross(c, d, a) * cross(c, d, b) <= 0

/** Whether the segment a–b touches the rectangle */
export function segmentTouchesRect(a: Point, b: Point, r: Rect) {
  if (inside(r, a) || inside(r, b)) return true
  const corners = [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }]
  return corners.some((c, i) => segmentsCross(a, b, c, corners[(i + 1) % 4]))
}

/** The selectable objects the rectangle touches (a path: any of its segments does) */
export function objectsInRect(board: Board, rect: Rect): BoardObject[] {
  return board.objects.filter((o) => {
    if (!canSelect(o)) return false
    if (o.kind === 'line' || o.kind === 'border') return segmentsOf(flattenedOf(o), o.kind === 'border' && !o.open).some(([a, b]) => segmentTouchesRect(a, b, rect))
    return boundsIntersect(boundsOf(o), rect)
  })
}
