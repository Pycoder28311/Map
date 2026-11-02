// Where an object is, as a rectangle (board units). Pure (bounds.test.ts).
import { flattenedOf } from './pathGeometry'
import { PIN_HEIGHT, PIN_WIDTH } from './pinIcons'
import { sizeFactor } from './zoomSize'
import { layoutOfText } from './measureText'
import { sagitta } from './textCurve'
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

/** The map's zoom as the editor shows it: texts and pins take less of the map when zoomed in (they grow gently with the zoom: zoomSize.ts; a text that keeps its size on the screen, `fixedSize`, takes even less) */
let zoom = 1
export const setTextZoom = (scale: number) => {
  zoom = scale > 0 ? scale : 1
}

/** A text's box at its own size, before it is turned: its top-left corner and what its layout needs */
export function textLayoutBox(o: TextObject): Rect {
  const layout = layoutOfText(o)
  const w = Math.max(layout.width, o.width, 1)
  // Bent text needs room for the bend: below for a rainbow, above for a smile
  const bend = sagitta(o.curve ?? 0, w)
  const pad = boxPads(o)
  return { x: o.anchor.x - pad.x, y: o.anchor.y - pad.y - ((o.curve ?? 0) < 0 ? bend : 0), w: w + 2 * pad.x, h: layout.height + bend + 2 * pad.y }
}

/** The room between a framed text and its frame */
export const boxPads = (o: TextObject) => {
  const pad = o.boxed ? Math.round(o.size * 0.4) : 0
  return { x: pad, y: pad }
}

/** How far the straight layout sits below the top of its box (the room above a smile-shaped text) */
export const bendAbove = (o: TextObject) => ((o.curve ?? 0) < 0 ? sagitta(o.curve ?? 0, Math.max(layoutOfText(o).width, o.width, 1)) : 0)

/** A text's box as it is on the map now: the same, shrunk about its corner while zoomed in (and grown while zoomed out) */
export function textBox(o: TextObject): Rect {
  const box = textLayoutBox(o)
  const k = o.fixedSize ? 1 / zoom : sizeFactor(zoom)
  return k === 1 ? box : { ...box, w: box.w * k, h: box.h * k }
}

/** A pin's box as it is on the map now: its tip at the anchor, its size the pin's times what the zoom makes of it */
export function pinBox(anchor: Point): Rect {
  const k = sizeFactor(zoom)
  return { x: anchor.x - (PIN_WIDTH * k) / 2, y: anchor.y - PIN_HEIGHT * k, w: PIN_WIDTH * k, h: PIN_HEIGHT * k }
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
      return pinBox(o.anchor)
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
