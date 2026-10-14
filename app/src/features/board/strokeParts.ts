// How a line type turns one polyline into what is stroked: the whole line, its dashes, two parallel lines, or ticks.
// Pure (strokeParts.test.ts). Lengths are in board units; `unit` is 1, or 1 / scale for a line of fixed width.
import type { Point, Style } from './types'

export type Parts = {
  lines: Point[][]
  /** Whether a single `lines[0]` is a ring (solid ring of a border or a shape) */
  closed: boolean
  /** The width each line is stroked with (as a share of the style's thickness) */
  width: number
}

/** The most parts one line may be cut into (a tiny dash on a huge line stays a solid line instead of freezing the page) */
const MAX_PARTS = 5000
/** How far a mitre may stick out, as a multiple of half the gap */
const MITRE = 2

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y)

const ringOf = (polyline: Point[], closed: boolean) => (closed && polyline.length > 2 ? [...polyline, polyline[0]] : polyline)

/** The dashes: `on` long, `off` apart, along the whole polyline */
function dashes(polyline: Point[], on: number, off: number): Point[][] {
  const out: Point[][] = []
  let current: Point[] = [polyline[0]]
  let drawing = true
  let left = on
  for (let i = 1; i < polyline.length; i++) {
    let from = polyline[i - 1]
    const to = polyline[i]
    let rest = distance(from, to)
    while (rest > left) {
      const t = left / rest
      const cut = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
      if (drawing) {
        current.push(cut)
        out.push(current)
        current = []
      } else current = [cut]
      rest -= left
      from = cut
      drawing = !drawing
      left = drawing ? on : off
    }
    left -= rest
    if (drawing) current.push(to)
  }
  if (drawing && current.length > 1) out.push(current)
  return out
}

/** The polyline moved `offset` to its left (negative: right), mitred at the corners */
export function offsetLine(polyline: Point[], offset: number): Point[] {
  const n = polyline.length
  if (n < 2) return polyline
  const normal = (a: Point, b: Point) => {
    const l = distance(a, b) || 1
    return { x: -(b.y - a.y) / l, y: (b.x - a.x) / l }
  }
  return polyline.map((p, i) => {
    const before = i > 0 ? normal(polyline[i - 1], p) : null
    const after = i < n - 1 ? normal(p, polyline[i + 1]) : null
    const a = before ?? after!
    const b = after ?? before!
    const sx = a.x + b.x
    const sy = a.y + b.y
    const sl = Math.hypot(sx, sy)
    if (sl < 1e-6) return { x: p.x + a.x * offset, y: p.y + a.y * offset }
    const mx = sx / sl
    const my = sy / sl
    const cos = mx * a.x + my * a.y
    const scale = Math.min(MITRE, 1 / Math.max(cos, 1e-6))
    return { x: p.x + mx * offset * scale, y: p.y + my * offset * scale }
  })
}

/** Ticks across the line every `spacing`, slanted 45°, each `length` long */
function ticks(polyline: Point[], spacing: number, length: number): Point[][] {
  const out: Point[][] = []
  let next = spacing / 2
  let walked = 0
  for (let i = 1; i < polyline.length; i++) {
    const a = polyline[i - 1]
    const b = polyline[i]
    const l = distance(a, b)
    if (l === 0) continue
    const dx = (b.x - a.x) / l
    const dy = (b.y - a.y) / l
    // The tick's direction: the line's direction turned 45°
    const tx = (dx - dy) * Math.SQRT1_2
    const ty = (dx + dy) * Math.SQRT1_2
    while (walked + l >= next) {
      const along = next - walked
      const c = { x: a.x + dx * along, y: a.y + dy * along }
      out.push([{ x: c.x - (tx * length) / 2, y: c.y - (ty * length) / 2 }, { x: c.x + (tx * length) / 2, y: c.y + (ty * length) / 2 }])
      next += spacing
    }
    walked += l
  }
  return out
}

/** What to stroke for the style's type, from the (softened) polyline of an object */
export function strokeParts(polyline: Point[], style: Style, unit: number, closed = false): Parts {
  const solid: Parts = { lines: [polyline], closed, width: 1 }
  if (polyline.length < 2 || style.type === 'solid') return solid
  const ring = ringOf(polyline, closed)
  const thickness = style.thickness * unit
  switch (style.type) {
    case 'dashed': {
      const on = Math.max(0.5, style.part * unit)
      const off = Math.max(0.5, style.gap * unit)
      let length = 0
      for (let i = 1; i < ring.length; i++) length += distance(ring[i - 1], ring[i])
      if (length / (on + off) > MAX_PARTS) return solid
      return { lines: dashes(ring, on, off), closed: false, width: 1 }
    }
    case 'double': {
      const half = Math.max(0.5, style.gap * unit) / 2
      return { lines: [offsetLine(ring, half), offsetLine(ring, -half)], closed: false, width: 1 }
    }
    case 'diagonal': {
      const spacing = Math.max(1, (style.part + style.gap) * unit)
      let length = 0
      for (let i = 1; i < ring.length; i++) length += distance(ring[i - 1], ring[i])
      if (length / spacing > MAX_PARTS) return solid
      return { lines: ticks(ring, spacing, Math.max(2, 3 * thickness)), closed: false, width: 1 }
    }
  }
}
