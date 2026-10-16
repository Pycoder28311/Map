// A drawn stroke becomes a line the way the pen's drawing way says (map.md). Pure (drawLine.test.ts).
// The plain pencil (exact way) stays what it always was: the simplified path of the pointer.
import { autoHandles } from './bezier'
import type { Patch } from './changes'
import { lineFromStroke } from './paths'
import { softnessOf } from './style'
import { LAYER_MAIN, type LineObject, type Point, type ShapeObject, type ShapeType, type Style } from './types'

const MIN_BOX = 4

/** How far a dropped point may be from the line, per way (screen pixels, at zoom 1 board units; bigger = fewer, smoother points) */
const TOLERANCE = { exact: 1, rounded: 8, straight: 0, corners: 6 } as const

/** What `style.amount` starts at when a way is picked: corners' degrees; the others have nothing or start sharp */
export const WAY_AMOUNT = { exact: 0, rounded: 0, straight: 0, corners: 45 } as const

/** Degrees the path turns at `b`, coming from `a` and going to `c` */
const turn = (a: Point, b: Point, c: Point) => {
  const x = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x)
  return Math.abs((((x * 180) / Math.PI + 540) % 360) - 180)
}

/** The corners of a path: its ends, and each point where it turns at least `degrees` */
export function cornersOf(points: Point[], degrees: number): Point[] {
  if (points.length < 3) return points
  const out = [points[0]]
  for (let i = 1; i < points.length - 1; i++) if (turn(out[out.length - 1], points[i], points[i + 1]) >= degrees) out.push(points[i])
  out.push(points[points.length - 1])
  return out
}

/**
 * The line a stroke makes (ready for addObject). Its points are thinned as the pen goes (`thin`), so drawn live it is already this line.
 * The tolerance is in screen pixels, so it is divided by the view's `scale`: zoomed in, more points are kept and the line stays smooth
 */
export function drawLine(stroke: Point[], style: Style, scale = 1): Omit<LineObject, 'id'> {
  const base = lineFromStroke(stroke, style, (TOLERANCE[style.way] || 1) / scale)
  switch (style.way) {
    case 'exact':
      return base
    case 'rounded':
      return { ...base, handles: autoHandles(base.points) }
    case 'straight': {
      const first = base.points[0]
      const last = base.points[base.points.length - 1]
      const same = first.x === last.x && first.y === last.y
      return { ...base, points: same ? [first] : [first, last] }
    }
    case 'corners':
      return { ...base, points: cornersOf(base.points, style.amount) }
  }
}

/** Changing a line's way keeps its points: rounded gets smooth handles, the others lose them */
export function wayChange(line: LineObject, way: Style['way']): Patch {
  if (line.style.way === way) return {}
  const style = { ...line.style, way, amount: WAY_AMOUNT[way] }
  return { style, handles: way === 'rounded' ? autoHandles(line.points) : undefined }
}

/** A line's style changed in its modal: the style, and the handles that go with a change of way */
export function lineStylePatch(line: LineObject, style: Style): Patch {
  if (style.way === line.style.way) return { style }
  return { style, handles: style.way === 'rounded' ? autoHandles(line.points) : undefined }
}

/** Whether the pointer path can be drawn as the pencil always was (one segment at a time, nothing to work out) */
export const isPlain = (style: Style) =>
  style.way === 'exact' && style.type === 'solid' && softnessOf(style) === 0 && !style.stroke && !style.shadow && !style.road && !style.arrow.start && !style.arrow.end

type ShapePen = { shape: ShapeType; param: number; style: Style; fill: ShapeObject['fill'] }

/** The shape dragged from corner `a` to corner `b` (`square`: Shift), or null while it is too small to be one */
export function drawShape(a: Point, b: Point, pen: ShapePen, square = false): Omit<ShapeObject, 'id'> | null {
  let w = Math.abs(b.x - a.x)
  let h = Math.abs(b.y - a.y)
  if (square) w = h = Math.max(w, h)
  if (w < MIN_BOX || h < MIN_BOX) return null
  const x = b.x >= a.x ? a.x : a.x - w
  const y = b.y >= a.y ? a.y : a.y - h
  const box = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
  return { kind: 'shape', layer: LAYER_MAIN, name: '', links: [], style: pen.style, shape: pen.shape, box, rotation: 0, param: pen.param, fill: pen.fill }
}
