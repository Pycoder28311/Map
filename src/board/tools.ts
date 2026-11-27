// What each tool does with the pointer, in units. A press starts a gesture (one undo step); the board calls its `move` and `up`.
import { mirrorCopies, mirrorPoints } from '../model/mirror'
import { floodFill, stampOf, stroke } from '../model/paint'
import { boundsOf, flatten, shapeAt, textLayout, type Box } from '../model/raster'
import { newId, type Drawing, type LineItem, type ShapeItem, type TextItem } from '../model/types'
import { begin, commit, end, getState, live, paintCopy, select, setSettings, touch, withAdded, withShape, type Settings } from '../store/store'
import { resizeBox, type Handle } from './view'

export type Mods = { shift: boolean; alt: boolean }
export type Gesture = { move: (at: [number, number], mods: Mods) => void; up: () => void }

const none: Gesture = { move: () => {}, up: () => {} }

/** Ask the selection panel to put the caret in the selected text's field */
export const EDIT_TEXT_EVENT = 'pixelboard:edit-text'
/** Set until a text field takes the caret: a text just placed has no field yet when it asks (the panel shows it on the next render) */
let pendingEdit = false
export const editText = () => {
  pendingEdit = true
  window.dispatchEvent(new Event(EDIT_TEXT_EVENT))
}
/** Whether a text field should take the caret now (once) */
export const takeEdit = () => {
  const want = pendingEdit
  pendingEdit = false
  return want
}

/** The last unit a brush or eraser stroke ended on (Shift + press: a straight stroke from there) */
let lastPoint: [number, number] | null = null

/** The eyedropper: the colour seen at a unit becomes the main colour */
export function pickColor(at: [number, number]) {
  const d = getState().drawing
  const color = flatten(d)[at[1] * d.width + at[0]]
  if (color) setSettings({ main: color })
}

function paintStroke(at: [number, number], mods: Mods, erase: boolean): Gesture {
  const { settings, drawing } = getState()
  begin()
  const paint = paintCopy()
  const stamp = stampOf(settings.brushShape, settings.brushSize)
  const color = erase ? null : settings.main
  const from = mods.shift && lastPoint ? lastPoint : at
  let last = at
  if (stroke(paint.cells, drawing.width, drawing.height, from, at, stamp, color, settings.mirror)) touch()
  return {
    move: (to) => {
      if (stroke(paint.cells, drawing.width, drawing.height, last, to, stamp, color, settings.mirror)) touch()
      last = to
    },
    up: () => {
      lastPoint = last
      // The stroke painted in place: the drawing is a new object for the history and the caches
      const d = getState().drawing
      live({ ...d, items: [...d.items] })
      end()
    },
  }
}

function fill(at: [number, number]) {
  const { settings, drawing } = getState()
  begin()
  const seen = flatten(drawing)
  const paint = paintCopy()
  let changed = false
  for (const [x, y] of mirrorPoints(at[0], at[1], drawing.width, drawing.height, settings.mirror))
    changed = floodFill(paint.cells, seen, drawing.width, drawing.height, x, y, settings.main) || changed
  if (changed) {
    const d = getState().drawing
    live({ ...d, items: [...d.items] })
  }
  end()
}

/** A new shape from the settings, covering the units from `a` to `b` */
function shapeFrom(tool: 'rect' | 'stepped' | 'ellipse' | 'line', s: Settings, a: [number, number], b: [number, number], id: string): ShapeItem {
  if (tool === 'line') return { kind: 'line', id, x1: a[0], y1: a[1], x2: b[0], y2: b[1], thickness: s.lineThickness, color: s.main }
  const box = { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]) + 1, h: Math.abs(b[1] - a[1]) + 1 }
  // Neither border nor fill would show nothing: a 1-unit border then
  const border = { color: s.main, thickness: s.border || !s.fill ? s.borderThickness || 1 : 0 }
  const fill = s.fill ? s.second : null
  if (tool === 'ellipse') return { kind: 'ellipse', id, ...box, border, fill }
  return { kind: 'rect', id, ...box, border, fill, steps: tool === 'stepped' ? s.steps : 0 }
}

/** Shift: a square box (shapes), or a line at 0°, 45° or 90° */
function constrain(tool: string, a: [number, number], b: [number, number]): [number, number] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (tool === 'line') {
    if (Math.abs(dx) > 2 * Math.abs(dy)) return [b[0], a[1]]
    if (Math.abs(dy) > 2 * Math.abs(dx)) return [a[0], b[1]]
    const m = Math.max(Math.abs(dx), Math.abs(dy))
    return [a[0] + Math.sign(dx) * m, a[1] + Math.sign(dy) * m]
  }
  const m = Math.max(Math.abs(dx), Math.abs(dy))
  return [a[0] + (Math.sign(dx) || 1) * m, a[1] + (Math.sign(dy) || 1) * m]
}

/** A text's mirror copies need its letters' box */
const copiesOf = (item: ShapeItem, d: Drawing, s: Settings) => {
  const t = item.kind === 'text' ? textLayout(item) : { w: 0, h: 0 }
  return mirrorCopies(item, s.mirror, d.width, d.height, t.w, t.h)
}

function drawShape(tool: 'rect' | 'stepped' | 'ellipse' | 'line', at: [number, number]): Gesture {
  const { settings } = getState()
  begin()
  const base = getState().drawing
  const id = newId(tool)
  let item = shapeFrom(tool, settings, at, at, id)
  live(withAdded(base, [item]))
  return {
    move: (to, mods) => {
      item = shapeFrom(tool, settings, at, mods.shift ? constrain(tool, at, to) : to, id)
      live(withAdded(base, [item]))
    },
    up: () => {
      const d = getState().drawing
      const placed = d.items.find((i) => i.id === id) as ShapeItem
      live(withAdded(d, copiesOf(placed, d, settings)))
      end()
      select(id)
    },
  }
}

function placeText(at: [number, number]) {
  const { settings: s, drawing } = getState()
  const item: TextItem = {
    kind: 'text',
    id: newId('text'),
    x: at[0],
    y: at[1],
    text: 'Text',
    size: s.textSize,
    color: s.main,
    letterSpacing: s.letterSpacing,
    lineSpacing: s.lineSpacing,
    align: s.align,
    outline: s.outline ? s.second : null,
    shadow: s.shadow ? { color: s.shadowColor, dx: s.shadowDx, dy: s.shadowDy } : null,
  }
  commit(withAdded(drawing, [item, ...copiesOf(item, drawing, s)]))
  select(item.id)
  editText()
}

/** A selected shape moved by whole units */
export function moved(item: ShapeItem, dx: number, dy: number): ShapeItem {
  if (item.kind === 'line') return { ...item, x1: item.x1 + dx, x2: item.x2 + dx, y1: item.y1 + dy, y2: item.y2 + dy }
  return { ...item, x: item.x + dx, y: item.y + dy }
}

/** A shape fitted to a new box: a rectangle or an ellipse takes it; a line's ends follow it; a text changes size (1× … 4×) */
export function fitted(item: ShapeItem, from: Box, to: Box): ShapeItem {
  if (item.kind === 'rect' || item.kind === 'ellipse') return { ...item, ...to }
  if (item.kind === 'line') {
    const map = (v: number, a: number, aw: number, b: number, bw: number) => b + Math.round(((v - a) * Math.max(0, bw - 1)) / Math.max(1, aw - 1))
    const l: LineItem = { ...item }
    const pad = Math.floor((item.thickness - 1) / 2)
    const fx = from.x + pad
    const fy = from.y + pad
    const fw = from.w - item.thickness + 1
    const fh = from.h - item.thickness + 1
    const tw = Math.max(1, to.w - item.thickness + 1)
    const th = Math.max(1, to.h - item.thickness + 1)
    l.x1 = map(item.x1, fx, fw, to.x + pad, tw)
    l.x2 = map(item.x2, fx, fw, to.x + pad, tw)
    l.y1 = map(item.y1, fy, fh, to.y + pad, th)
    l.y2 = map(item.y2, fy, fh, to.y + pad, th)
    return l
  }
  const size = Math.min(4, Math.max(1, Math.round((item.size * to.h) / from.h))) as TextItem['size']
  const next = { ...item, size }
  const b = boundsOf(next)
  // The side opposite the handle stays where it was
  const dx = to.x !== from.x ? from.x + from.w - (b.x + b.w) : from.x - b.x
  const dy = to.y !== from.y ? from.y + from.h - (b.y + b.h) : from.y - b.y
  return { ...next, x: next.x + dx, y: next.y + dy }
}

function moveSelected(item: ShapeItem, at: [number, number]): Gesture {
  begin()
  const base = getState().drawing
  return {
    move: (to) => live(withShape(base, moved(item, to[0] - at[0], to[1] - at[1]))),
    up: end,
  }
}

export function resizeSelected(item: ShapeItem, handle: Handle): Gesture {
  begin()
  const base = getState().drawing
  const from = boundsOf(item)
  return {
    move: (to, mods) => live(withShape(base, fitted(item, from, resizeBox(from, handle, to, mods.shift)))),
    up: end,
  }
}

/** A press of the pointer on unit `at` with the current tool */
export function press(at: [number, number], mods: Mods): Gesture {
  const { tool, drawing } = getState()
  // Alt held: the eyedropper, whatever the tool
  if (mods.alt || tool === 'eyedropper') {
    pickColor(at)
    return none
  }
  switch (tool) {
    case 'brush':
      return paintStroke(at, mods, false)
    case 'eraser':
      return paintStroke(at, mods, true)
    case 'fill':
      fill(at)
      return none
    case 'rect':
    case 'stepped':
    case 'ellipse':
    case 'line':
      return drawShape(tool, at)
    case 'text': {
      const hit = shapeAt(drawing, at[0], at[1])
      if (hit?.kind === 'text') {
        select(hit.id)
        editText()
        return moveSelected(hit, at)
      }
      placeText(at)
      return none
    }
    case 'select': {
      const hit = shapeAt(drawing, at[0], at[1])
      select(hit?.id ?? null)
      return hit ? moveSelected(hit, at) : none
    }
  }
}
