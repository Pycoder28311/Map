// Where an object is, as a rectangle (board units). Pure (bounds.test.ts).
import { flattenedOf } from './pathGeometry'
import { PIN_HEIGHT, PIN_WIDTH } from './pinIcons'
import { layoutOfText } from './measureText'
import type { BoardObject, Point, TextObject } from './types'

export type Rect = { x: number; y: number; w: number; h: number }


/** The corners of a shape's box, turned by its rotation about the centre */
export function shapeCorners(box: Rect, rotationDegrees: number): Point[] {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  const r = (rotationDegrees * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  return [
    [-box.w / 2, -box.h / 2],
    [box.w / 2, -box.h / 2],
    [box.w / 2, box.h / 2],
    [-box.w / 2, box.h / 2],
  ].map(([dx, dy]) => ({ x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }))
}

const rectOf = (points: Point[], pad = 0): Rect => {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y }
}

/** A text's box before it is turned: its top-left corner and what its layout needs */
export function textBox(o: TextObject): Rect {
  const layout = layoutOfText(o)
  return { x: o.anchor.x, y: o.anchor.y, w: Math.max(layout.width, o.width, 1), h: layout.height }
}

/** The rectangle around an object (a path: its points and half its thickness) */
export function boundsOf(o: BoardObject): Rect {
  switch (o.kind) {
    case 'line':
      return rectOf(flattenedOf(o), o.style.thickness / 2 + (o.style.arrow.start || o.style.arrow.end ? o.style.arrow.size : 0))
    case 'border':
    case 'shape':
      return rectOf(flattenedOf(o), o.style.thickness / 2)
    case 'text':
      return rectOf(shapeCorners(textBox(o), o.rotation))
    case 'point':
      return { x: o.anchor.x - PIN_WIDTH / 2, y: o.anchor.y - PIN_HEIGHT, w: PIN_WIDTH, h: PIN_HEIGHT }
  }
}

/** The rectangle around all of them (null for none) */
export function unionBounds(objects: BoardObject[]): Rect | null {
  if (objects.length === 0) return null
  const rects = objects.map(boundsOf)
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y }
}

export const boundsIntersect = (a: Rect, b: Rect) => a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h

/** A rectangle from two corners (the marquee), whichever way it was dragged */
export function rectFrom(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }
}
