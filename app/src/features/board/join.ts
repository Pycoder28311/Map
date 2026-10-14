// Two lines that touch end to end become one. Pure (join.test.ts).
import type { Change } from './changes'
import { canSelect } from './layers'
import type { Board, Handle, LineObject, Point } from './types'

/** How close (board units) two ends must be to count as touching */
export const TOUCH = 3

export type Junction = { a: LineObject; aEnd: 'start' | 'end'; b: LineObject; bEnd: 'start' | 'end'; at: Point }

const endOf = (line: LineObject, end: 'start' | 'end') => (end === 'start' ? line.points[0] : line.points[line.points.length - 1])

/** Where two different lines' ends touch and `p` is on it (`tolerance`: board units), the topmost pair; null for none */
export function findJunction(board: Board, p: Point, tolerance: number): Junction | null {
  const near: { line: LineObject; end: 'start' | 'end'; at: Point }[] = []
  for (const o of board.objects) {
    if (o.kind !== 'line' || !canSelect(o) || o.points.length < 2) continue
    for (const end of ['start', 'end'] as const) {
      const at = endOf(o, end)
      if (Math.hypot(at.x - p.x, at.y - p.y) <= tolerance) near.push({ line: o, end, at })
    }
  }
  for (let i = near.length - 1; i >= 0; i--) {
    for (let j = i - 1; j >= 0; j--) {
      const x = near[i]
      const y = near[j]
      if (x.line.id !== y.line.id && Math.hypot(x.at.x - y.at.x, x.at.y - y.at.y) <= TOUCH) {
        return { a: y.line, aEnd: y.end, b: x.line, bEnd: x.end, at: { x: Math.round((x.at.x + y.at.x) / 2), y: Math.round((x.at.y + y.at.y) / 2) } }
      }
    }
  }
  return null
}

const NONE: Handle = { inX: 0, inY: 0, outX: 0, outY: 0 }

/** A line walked the other way: points reversed, each handle's two sides swapped */
export function reversed(line: LineObject): Pick<LineObject, 'points' | 'handles'> {
  return {
    points: [...line.points].reverse(),
    ...(line.handles ? { handles: [...line.handles].reverse().map((h) => ({ inX: h.outX, inY: h.outY, outX: h.inX, outY: h.inY })) } : {}),
  }
}

/** The change that makes the two lines one: `a` (first, keeps its name and style) runs on into `b`; `b` goes */
export function joinLines(j: Junction): { change: Change; id: number } {
  const first = j.aEnd === 'end' ? j.a : { ...j.a, ...reversed(j.a) }
  const second = j.bEnd === 'start' ? j.b : { ...j.b, ...reversed(j.b) }
  // The two ends meet in one point: the second line's first point is the first's last
  const points = [...first.points, ...second.points.slice(1)]
  let handles: Handle[] | undefined
  if (first.handles || second.handles) {
    const a = first.handles ?? first.points.map(() => NONE)
    const b = second.handles ?? second.points.map(() => NONE)
    // The meeting point keeps the first's way in and the second's way out
    handles = [...a.slice(0, -1), { ...a[a.length - 1], outX: b[0].outX, outY: b[0].outY }, ...b.slice(1)]
  }
  const links = [...j.a.links]
  for (const l of j.b.links) if (!links.some((k) => k.to === l.to && k.id === l.id)) links.push(l)
  return { change: { update: [{ id: j.a.id, patch: { points, handles, links } }], remove: [j.b.id] }, id: j.a.id }
}
