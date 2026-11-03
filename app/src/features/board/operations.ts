// What the box's buttons and gestures do, as changes. Pure (operations.test.ts).
import { textBox, unionBounds, type Rect } from './bounds'
import type { Change, Draft, Patch } from './changes'
import { compose, flipAbout, rotateAbout, scaleAbout, transformObject, translate, type Matrix } from './transform'
import type { BoardObject, Point } from './types'

/** Smallest a resize makes the box (board units) */
export const MIN_SIZE = 4
/** Narrowest a text is made to wrap (board units) */
export const MIN_TEXT_WIDTH = 20
/** How far a copy sits from its original */
export const DUPLICATE_OFFSET = 16
/** Rotation snaps to this many degrees while Shift is held */
export const ROTATE_SNAP = 15
/** A turn this close (degrees) to 0, 90, 180 or 270 sticks there: a little past it, it comes free */
export const ROTATE_STICKY = 4

/** The fields an object's position and shape are made of: what a transform changes */
function geometryPatch(o: BoardObject): Patch {
  switch (o.kind) {
    case 'line':
    case 'border':
      return o.handles ? { points: o.points, handles: o.handles } : { points: o.points }
    case 'shape':
      return { box: o.box, rotation: o.rotation }
    case 'text':
      return { anchor: o.anchor, rotation: o.rotation, size: o.size, width: o.width, ...(o.runs ? { runs: o.runs } : {}) }
    case 'point':
      return { anchor: o.anchor }
  }
}

/** Every object after `m`, as updates */
export function transformAll(objects: BoardObject[], m: Matrix): Change {
  return { update: objects.map((o) => ({ id: o.id, patch: geometryPatch(transformObject(o, m)) })) }
}

export const moveBy = (objects: BoardObject[], dx: number, dy: number): Change => transformAll(objects, translate(dx, dy))

/**
 * `radians` of turn, stuck to the right angle it is within ROTATE_STICKY of. One shape or text counts from the turn it already has, so it
 * stands straight on the map; anything else (a line has no turn of its own) from where it was
 */
export function stickyTurn(objects: BoardObject[], radians: number): number {
  const one = objects.length === 1 ? objects[0] : null
  const base = one?.kind === 'shape' || one?.kind === 'text' ? one.rotation : 0
  const degrees = base + (radians * 180) / Math.PI
  const near = Math.round(degrees / 90) * 90
  return Math.abs(degrees - near) <= ROTATE_STICKY ? ((near - base) * Math.PI) / 180 : radians
}

/** The points on the selection box that are dragged: its four corners (size and turn) and the middles of its four edges (only the width or the height) */
export type CornerHandle = 'tl' | 'tr' | 'bl' | 'br'
export type EdgeHandle = 't' | 'b' | 'l' | 'r'
export type BoxHandle = CornerHandle | EdgeHandle

const OPPOSITE: Record<BoxHandle, BoxHandle> = { tl: 'br', tr: 'bl', bl: 'tr', br: 'tl', t: 'b', b: 't', l: 'r', r: 'l' }

export const isEdgeHandle = (handle: BoxHandle): handle is EdgeHandle => handle.length === 1

/** Where a handle is on a box */
function handlePoint(box: Rect, handle: BoxHandle): Point {
  return {
    x: handle.includes('l') ? box.x : handle.includes('r') ? box.x + box.w : box.x + box.w / 2,
    y: handle.includes('t') ? box.y : handle.includes('b') ? box.y + box.h : box.y + box.h / 2,
  }
}

/** Which way a handle grows the box along each axis */
const growth = (handle: BoxHandle) => ({ x: handle.includes('l') ? -1 : 1, y: handle.includes('t') ? -1 : 1 })

/** One text's wrap width after a scale of `sx`; its left side is the one dragged: it grows to the left, so its right side stays */
function wrapped(t: Extract<BoardObject, { kind: 'text' }>, sx: number, handle: BoxHandle) {
  const was = Math.max(t.width, textBox(t).w)
  const width = Math.max(MIN_TEXT_WIDTH, Math.round(was * sx))
  return { width, anchor: handle.includes('l') ? { x: Math.round(t.anchor.x - (width - was)), y: t.anchor.y } : t.anchor }
}

/**
 * A corner handle dragged to `now`: the box (`start`, as it was) grows or shrinks from the opposite corner,
 * to any ratio (`keepRatio`: the bigger of the two scales is used for both)
 */
export function resizeTo(objects: BoardObject[], start: Rect, now: Point, keepRatio: boolean, handle: CornerHandle = 'tr'): Change {
  const anchor = handlePoint(start, OPPOSITE[handle])
  const grow = growth(handle)
  let sx = Math.max(MIN_SIZE, (now.x - anchor.x) * grow.x) / Math.max(start.w, 1)
  let sy = Math.max(MIN_SIZE, (now.y - anchor.y) * grow.y) / Math.max(start.h, 1)
  if (keepRatio) sx = sy = Math.max(sx, sy)
  // One text alone: the handle changes how wide it wraps, not how big its letters are
  if (objects.length === 1 && objects[0].kind === 'text') {
    return { update: [{ id: objects[0].id, patch: wrapped(objects[0], sx, handle) }] }
  }
  return transformAll(objects, scaleAbout(anchor, sx, sy))
}

/**
 * A corner handle dragged to `now`, sizing and turning together about the opposite corner: the handle follows the pointer, so the
 * distance to that corner sets the (equal) scale and the angle around it the turn (snapped to ROTATE_SNAP degrees when asked). One text
 * alone is not scaled: its width follows the pointer, as with a plain resize, and it turns.
 */
export function resizeAndTurn(objects: BoardObject[], start: Rect, now: Point, snap: boolean, handle: CornerHandle = 'tr'): Change {
  const anchor = handlePoint(start, OPPOSITE[handle])
  const corner = handlePoint(start, handle)
  const from = { x: corner.x - anchor.x, y: corner.y - anchor.y }
  const to = { x: now.x - anchor.x, y: now.y - anchor.y }
  const step = (ROTATE_SNAP * Math.PI) / 180
  let turn = Math.atan2(to.y, to.x) - Math.atan2(from.y, from.x)
  turn = snap ? Math.round(turn / step) * step : stickyTurn(objects, turn)
  const scale = Math.max(Math.hypot(to.x, to.y) / Math.max(Math.hypot(from.x, from.y), 1), MIN_SIZE / Math.max(Math.hypot(from.x, from.y), 1))
  if (objects.length === 1 && objects[0].kind === 'text') {
    // The pointer as it would be with no turn gives the width
    const cos = Math.cos(-turn)
    const sin = Math.sin(-turn)
    const level = to.x * cos - to.y * sin
    const t = objects[0]
    const sx = Math.max(MIN_SIZE, level * growth(handle).x) / Math.max(start.w, 1)
    return transformAll([{ ...t, ...wrapped(t, sx, handle) }], rotateAbout(anchor, turn))
  }
  return transformAll(objects, compose(rotateAbout(anchor, turn), scaleAbout(anchor, scale, scale)))
}

/**
 * The handle in the middle of an edge dragged to `now`: only the width (or only the height) changes, from the opposite edge, and nothing
 * turns: what was turned keeps its turn. One text alone changes how wide it wraps (it has no height of its own to set)
 */
export function resizeEdge(objects: BoardObject[], start: Rect, now: Point, handle: EdgeHandle): Change {
  const anchor = handlePoint(start, OPPOSITE[handle])
  const grow = growth(handle)
  const across = handle === 'l' || handle === 'r'
  const sx = across ? Math.max(MIN_SIZE, (now.x - anchor.x) * grow.x) / Math.max(start.w, 1) : 1
  const sy = across ? 1 : Math.max(MIN_SIZE, (now.y - anchor.y) * grow.y) / Math.max(start.h, 1)
  if (objects.length === 1 && objects[0].kind === 'text') {
    return across ? { update: [{ id: objects[0].id, patch: wrapped(objects[0], sx, handle) }] } : {}
  }
  const m = scaleAbout(anchor, sx, sy)
  return {
    update: objects.map((o) => {
      const moved = transformObject(o, m)
      return { id: o.id, patch: geometryPatch(moved.kind === 'shape' || moved.kind === 'text' ? { ...moved, rotation: (o as typeof moved).rotation } : moved) }
    }),
  }
}

/** Turned by `radians` about `centre` (snapped to ROTATE_SNAP degrees when asked; else a little sticky at the right angles) */
export function rotateBy(objects: BoardObject[], centre: Point, radians: number, snap: boolean): Change {
  const step = (ROTATE_SNAP * Math.PI) / 180
  return transformAll(objects, rotateAbout(centre, snap ? Math.round(radians / step) * step : stickyTurn(objects, radians)))
}

/** Mirrored about the middle of the selection */
export function flip(objects: BoardObject[], axis: 'h' | 'v'): Change {
  const b = unionBounds(objects)
  return b ? transformAll(objects, flipAbout(axis, { x: b.x + b.w / 2, y: b.y + b.h / 2 })) : {}
}

/** Copies, moved by DUPLICATE_OFFSET (the store gives them their ids) */
export function duplicate(objects: BoardObject[]): Change {
  return {
    add: objects.map((o) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = transformObject(o, translate(DUPLICATE_OFFSET, DUPLICATE_OFFSET))
      // A copy of a text is its own: it follows nothing and names nothing
      if (rest.kind === 'text') return { ...rest, attach: undefined, isName: undefined } as Draft
      return rest as Draft
    }),
  }
}

export const remove = (ids: number[]): Change => ({ remove: ids })

export { compose }
