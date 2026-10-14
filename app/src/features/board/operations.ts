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
 * The top-right handle dragged to `now`: the box (`start`, as it was) grows or shrinks from its bottom-left corner,
 * to any ratio (`keepRatio`: the bigger of the two scales is used for both)
 */
export function resizeTo(objects: BoardObject[], start: Rect, now: Point, keepRatio: boolean): Change {
  const anchor = { x: start.x, y: start.y + start.h }
  let sx = Math.max(MIN_SIZE, now.x - anchor.x) / Math.max(start.w, 1)
  let sy = Math.max(MIN_SIZE, anchor.y - now.y) / Math.max(start.h, 1)
  if (keepRatio) sx = sy = Math.max(sx, sy)
  // One text alone: the handle changes how wide it wraps, not how big its letters are
  if (objects.length === 1 && objects[0].kind === 'text') {
    const t = objects[0]
    const width = Math.max(MIN_TEXT_WIDTH, Math.round(Math.max(t.width, textBox(t).w) * sx))
    return { update: [{ id: t.id, patch: { width, anchor: t.anchor } }] }
  }
  return transformAll(objects, scaleAbout(anchor, sx, sy))
}

/** Turned by `radians` about `centre` (snapped to ROTATE_SNAP degrees when asked) */
export function rotateBy(objects: BoardObject[], centre: Point, radians: number, snap: boolean): Change {
  const step = (ROTATE_SNAP * Math.PI) / 180
  return transformAll(objects, rotateAbout(centre, snap ? Math.round(radians / step) * step : radians))
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
