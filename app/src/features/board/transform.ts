// Moving, scaling, turning and mirroring objects. Pure (transform.test.ts). Whole numbers come out (the file format).
import { textBox } from './bounds'
import { scaleRuns } from './textRuns'
import type { BoardObject, Point } from './types'

/** [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Matrix = readonly [number, number, number, number, number, number]

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

export const apply = (m: Matrix, p: Point): Point => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] })
/** Only the scaling / turning part (for offsets, e.g. curve handles) */
const applyLinear = (m: Matrix, p: Point): Point => ({ x: m[0] * p.x + m[2] * p.y, y: m[1] * p.x + m[3] * p.y })

/** `a` after `b` (b is applied first) */
export const compose = (a: Matrix, b: Matrix): Matrix => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
]

export const translate = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy]
export const scaleAbout = (anchor: Point, sx: number, sy: number): Matrix => [sx, 0, 0, sy, anchor.x - sx * anchor.x, anchor.y - sy * anchor.y]
export function rotateAbout(centre: Point, radians: number): Matrix {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return [cos, sin, -sin, cos, centre.x - cos * centre.x + sin * centre.y, centre.y - sin * centre.x - cos * centre.y]
}
/** 'h': left and right swap (mirrored about the vertical line through `centre`); 'v': top and bottom */
export const flipAbout = (axis: 'h' | 'v', centre: Point): Matrix => (axis === 'h' ? scaleAbout(centre, -1, 1) : scaleAbout(centre, 1, -1))

const whole = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })
// -0 would be written as 0, but keeps equality checks (and snapshots) honest
const int = (n: number) => Math.round(n) + 0

/** The object after `m` (its other fields unchanged) */
export function transformObject<T extends BoardObject>(o: T, m: Matrix): T {
  switch (o.kind) {
    case 'line':
    case 'border':
      return {
        ...o,
        points: o.points.map((p) => whole(apply(m, p))),
        ...(o.handles ? { handles: o.handles.map((h) => {
          const i = applyLinear(m, { x: h.inX, y: h.inY })
          const out = applyLinear(m, { x: h.outX, y: h.outY })
          return { inX: int(i.x), inY: int(i.y), outX: int(out.x), outY: int(out.y) }
        }) } : {}),
      }
    case 'shape': {
      const r = (o.rotation * Math.PI) / 180
      const xAxis = applyLinear(m, { x: Math.cos(r), y: Math.sin(r) })
      const yAxis = applyLinear(m, { x: -Math.sin(r), y: Math.cos(r) })
      const centre = apply(m, { x: o.box.x + o.box.w / 2, y: o.box.y + o.box.h / 2 })
      const w = int(o.box.w * Math.hypot(xAxis.x, xAxis.y))
      const h = int(o.box.h * Math.hypot(yAxis.x, yAxis.y))
      const rotation = int(((Math.atan2(xAxis.y, xAxis.x) * 180) / Math.PI + 360) % 360)
      return { ...o, box: { x: int(centre.x - w / 2), y: int(centre.y - h / 2), w, h }, rotation }
    }
    case 'text': {
      // Like a shape: its centre follows, it turns with the matrix and grows with it (a mirror does not mirror the words)
      const box = textBox(o)
      const r = (o.rotation * Math.PI) / 180
      const xAxis = applyLinear(m, { x: Math.cos(r), y: Math.sin(r) })
      const yAxis = applyLinear(m, { x: -Math.sin(r), y: Math.cos(r) })
      const mirrored = m[0] * m[3] - m[1] * m[2] < 0
      const k = (Math.hypot(xAxis.x, xAxis.y) + Math.hypot(yAxis.x, yAxis.y)) / 2
      const scaled = Math.abs(k - 1) > 1e-9
      const centre = apply(m, { x: box.x + box.w / 2, y: box.y + box.h / 2 })
      const rotation = mirrored ? o.rotation : int(((Math.atan2(xAxis.y, xAxis.x) * 180) / Math.PI + 360) % 360)
      return {
        ...o,
        anchor: whole({ x: centre.x - (box.w * k) / 2, y: centre.y - (box.h * k) / 2 }),
        rotation,
        ...(scaled ? { size: Math.max(1, int(o.size * k)), ...(o.width > 0 ? { width: Math.max(1, int(o.width * k)) } : {}), ...(o.runs ? { runs: scaleRuns(o.runs, k) } : {}) } : {}),
      }
    }
    case 'point':
      return { ...o, anchor: whole(apply(m, o.anchor)) }
  }
}
