// The outlines of the shape tool's shapes, as closed polygons (curves sampled). Pure (shapes.test.ts).
import { cubicAt, type Cubic } from './bezier'
import type { Rect } from './bounds'
import type { Point, ShapeType } from './types'

/** The shapes that have one number (corner radius, star points), and its range */
export const SHAPE_PARAM: Partial<Record<ShapeType, { label: string; min: number; max: number; default: number }>> = {
  roundRect: { label: 'Corner radius', min: 0, max: 100, default: 16 },
  star: { label: 'Points', min: 3, max: 12, default: 5 },
}

export const shapeParamDefault = (shape: ShapeType) => SHAPE_PARAM[shape]?.default ?? 0

export const SHAPE_LABEL: Record<ShapeType, string> = {
  rect: 'Rectangle',
  roundRect: 'Rounded rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  rightTriangle: 'Right triangle',
  diamond: 'Diamond',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  star: 'Star',
  arrow: 'Arrow',
  heart: 'Heart',
}

const ELLIPSE_STEPS = 48
const ARC_STEPS = 8

/** Points as fractions (0–1) of the box */
const unit = (...xy: [number, number][]): Point[] => xy.map(([x, y]) => ({ x, y }))

function regular(sides: number, offset: number): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = offset + (i * 2 * Math.PI) / sides
    return { x: 0.5 + 0.5 * Math.cos(a), y: 0.5 + 0.5 * Math.sin(a) }
  })
}

function star(points: number): Point[] {
  const n = Math.min(12, Math.max(3, Math.round(points) || 5))
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / n
    const r = i % 2 === 0 ? 0.5 : 0.2
    return { x: 0.5 + r * Math.cos(a), y: 0.5 + r * Math.sin(a) }
  })
}

function heart(): Point[] {
  const left: Cubic = [{ x: 0.5, y: 0.95 }, { x: 0.05, y: 0.62 }, { x: -0.05, y: 0.15 }, { x: 0.25, y: 0.08 }]
  const top: Cubic = [{ x: 0.25, y: 0.08 }, { x: 0.4, y: 0.04 }, { x: 0.5, y: 0.15 }, { x: 0.5, y: 0.25 }]
  const out: Point[] = []
  for (const c of [left, top]) for (let s = 0; s < 12; s++) out.push(cubicAt(c, s / 12))
  const half = out
  const mirrored = [...half].reverse().map((p) => ({ x: 1 - p.x, y: p.y }))
  return [...half, ...mirrored]
}

function roundRect(w: number, h: number, radius: number): Point[] {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2))
  if (r === 0) return [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }]
  const corners: [number, number, number][] = [[w - r, r, -90], [w - r, h - r, 0], [r, h - r, 90], [r, r, 180]]
  const out: Point[] = []
  for (const [cx, cy, start] of corners) {
    for (let s = 0; s <= ARC_STEPS; s++) {
      const a = ((start + (90 * s) / ARC_STEPS) * Math.PI) / 180
      out.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
    }
  }
  return out
}

/** The outline in the box's own size, before rotation (relative to the box's top-left corner) */
function local(shape: ShapeType, w: number, h: number, param: number): Point[] {
  const scale = (ps: Point[]) => ps.map((p) => ({ x: p.x * w, y: p.y * h }))
  switch (shape) {
    case 'rect':
      return scale(unit([0, 0], [1, 0], [1, 1], [0, 1]))
    case 'roundRect':
      return roundRect(w, h, param)
    case 'ellipse':
      return scale(Array.from({ length: ELLIPSE_STEPS }, (_, i) => ({ x: 0.5 + 0.5 * Math.cos((i * 2 * Math.PI) / ELLIPSE_STEPS), y: 0.5 + 0.5 * Math.sin((i * 2 * Math.PI) / ELLIPSE_STEPS) })))
    case 'triangle':
      return scale(unit([0.5, 0], [1, 1], [0, 1]))
    case 'rightTriangle':
      return scale(unit([0, 0], [1, 1], [0, 1]))
    case 'diamond':
      return scale(unit([0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]))
    case 'pentagon':
      return scale(regular(5, -Math.PI / 2))
    case 'hexagon':
      return scale(regular(6, 0))
    case 'star':
      return scale(star(param))
    case 'arrow':
      return scale(unit([0, 0.3], [0.55, 0.3], [0.55, 0], [1, 0.5], [0.55, 1], [0.55, 0.7], [0, 0.7]))
    case 'heart':
      return scale(heart())
  }
}

/** The shape's outline in board units: sized to the box and turned by `rotationDegrees` about its centre */
export function shapeOutline(shape: ShapeType, box: Rect, rotationDegrees: number, param: number): Point[] {
  const r = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return local(shape, box.w, box.h, param).map((p) => {
    const dx = p.x - box.w / 2
    const dy = p.y - box.h / 2
    return { x: box.x + box.w / 2 + dx * cos - dy * sin, y: box.y + box.h / 2 + dx * sin + dy * cos }
  })
}
