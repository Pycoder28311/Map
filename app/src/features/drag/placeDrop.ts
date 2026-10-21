// Dropping an object somewhere in an ordered list moves it there (the 'place' zone of the drop system, objectDrop.ts): before or
// after a Dashboard card or a sidebar row, at the end of a Dashboard row, or into a project or folder row of the sidebar (as its last
// child). When it comes from another list it also takes that list's parent (a project's row; the Orphans row: none). The new place
// is a key between the neighbours (lib/resource/reorder.ts), sent through the resource's update in one request: shown at once, put
// back if the server refuses.
import type { DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { fallInto } from '../../components/ui/drop/fallInto'
import { dragPoint } from '../../lib/dnd'
import { endIndex, moveItem, placement, sameEntry, type Entry, type Placement } from '../../lib/resource/reorder'
import { resourceByPanelType } from '../../resources/registry'
import type { ObjectDragInfo } from '../workspace/types'
import { objectOf } from './objectDrag'
import type { ZoneHandler } from './objectDrop'

export const PLACE_ZONE = 'place'

/** A parent of a list: what an item coming from another list takes (null: none, the Orphans row) */
export type PlaceParent = { type: string; resource: string; id: number | string } | null

/** What a place in a list says about itself (its droppable's data, through placeDropData) */
export type PlaceTarget = {
  /** card: before or after it (left/right half); row: at the end of the list; node: before or after it (top/bottom), or into it */
  kind: 'card' | 'row' | 'node'
  /** The list the item lands in, in its order */
  list: () => Entry[]
  /** The card or row under the pointer */
  entry?: Entry
  /** The list's parent, given to an item from another list. Undefined: the list keeps every item's parent (a sidebar section) */
  parent?: PlaceParent
  /** Only this resource may land in the list (a sidebar section: its own) */
  only?: string
  /** A row that can be a parent: dropped in its middle, the item becomes its last child */
  into?: { parent: NonNullable<PlaceParent>; list: () => Entry[] }
  /** The sidebar row (its highlight and the fall-in effect) */
  nodeId?: string
  /** The Dashboard row it is in */
  rowId?: string
}

// A card lies over its Dashboard row: it wins (priority 3), the row (2) takes the rest of its area. Sidebar rows: 2, as before
export const placeDropData = (target: PlaceTarget) => ({ zone: PLACE_ZONE, priority: target.kind === 'card' ? 3 : 2, ...target })

export type PlaceSide = 'before' | 'after' | 'into' | 'end'

/** What a drop here would do: the place (its key: what is highlighted) and the update it makes */
export type PlaceValue = {
  key: string
  side: PlaceSide
  nodeId?: string
  /** `<resource>:<id>` of the card the bar is drawn by, or `row:<id>` for the end of a row */
  mark: string
  moved: Entry
  place: Placement
  /** The new parent; undefined: the parent stays */
  parent?: PlaceParent
}

/** Which part of a row or card the pointer is over */
export function sideOf(
  target: Pick<PlaceTarget, 'kind' | 'into'>,
  point: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
): PlaceSide {
  if (target.kind === 'row') return 'end'
  if (target.kind === 'card') return point.x < rect.left + rect.width / 2 ? 'before' : 'after'
  const frac = (point.y - rect.top) / rect.height
  if (target.into && frac > 0.25 && frac < 0.78) return 'into'
  return frac < 0.5 ? 'before' : 'after'
}

/** The dragged object as an entry of its resource (its id and pinned flag: what a place needs), or null when it has no resource */
function movedOf(item: ObjectDragInfo | undefined): Entry | null {
  const resource = resourceByPanelType(item?.kind)
  if (!item?.objectId || !resource) return null
  return { resource, item: { id: Number(item.objectId), pinned: item.pinned === true } }
}

/**
 * Where a drop on `target` at `side` puts `moved`, or null when it may not land there: another resource in a section, a parent it
 * cannot have, itself, the place it already has, across the pinned boundary. Pure: the rules of every place in one function.
 * `current`: the parent it is in now (from the drag), so taking the same parent again is not a change
 */
export function resolvePlace(
  target: PlaceTarget,
  side: PlaceSide,
  moved: Entry,
  current?: ObjectDragInfo['parent'],
): Omit<PlaceValue, 'key' | 'mark' | 'nodeId'> | null {
  // A row of a section that takes only its own resource (the Projects) takes any other one inside it: the whole row is "into"
  if (target.only && moved.resource.name !== target.only) {
    if (!target.into) return null
    side = 'into'
  }
  const into = side === 'into' ? target.into : undefined
  const full = into ? into.list() : target.list()
  const parent = into ? into.parent : target.parent
  const without = full.filter((entry) => !sameEntry(entry, moved))
  const inList = without.length !== full.length

  // An item from another list takes this list's parent (when it has one): it must be able to have it, and not be it
  let newParent: PlaceParent | undefined
  if (!inList && parent !== undefined) {
    if (parent === null ? !moved.resource.parents?.length : !moved.resource.parents?.some((p) => p.type === parent.type)) return null
    if (parent && parent.resource === moved.resource.name && String(parent.id) === String(moved.item.id)) return null
    const same = current !== undefined && current.type === (parent?.type ?? null) && current.id === (parent ? Number(parent.id) : null)
    newParent = same ? undefined : parent
  }

  let index: number
  if (side === 'into' || side === 'end') index = endIndex(without, moved)
  else {
    const entry = target.entry
    if (!entry || sameEntry(entry, moved)) return null
    const at = without.findIndex((other) => sameEntry(other, entry))
    if (at < 0) return null
    index = side === 'before' ? at : at + 1
  }
  // Where it already is: nothing to do
  if (inList && newParent === undefined && full.findIndex((entry) => sameEntry(entry, moved)) === index) return null

  const place = placement(without, index, moved)
  return place ? { side, moved, place, parent: newParent } : null
}

export const placeZone: ZoneHandler = {
  target: (e: DragMoveEvent | DragOverEvent, item) => {
    const target = e.over?.data.current as PlaceTarget | undefined
    const moved = movedOf(item)
    const point = dragPoint(e as DragMoveEvent)
    if (!target || !moved || !point || !e.over) return null
    const side = sideOf(target, point, e.over.rect)
    const resolved = resolvePlace(target, side, moved, item?.parent)
    if (!resolved) return null
    const mark = target.kind === 'row' ? `row:${target.rowId}` : target.entry ? `${target.entry.resource.name}:${target.entry.item.id}` : ''
    const value: PlaceValue = { ...resolved, key: `${target.nodeId ?? mark}:${resolved.side}`, mark, nodeId: target.nodeId }
    return value
  },
  drop: (data, target, float) => {
    const value = target as unknown as PlaceValue
    if (!objectOf(data)) return
    if (value.side === 'into' && value.nodeId) fallInto(float, value.nodeId, { lifted: true })
    const parent = value.parent === undefined ? undefined : value.parent && { type: value.parent.type, id: Number(value.parent.id) }
    moveItem(value.moved, value.place, parent).catch((error) => console.error(`Could not move the ${value.moved.resource.ui.label.toLowerCase()}`, error))
  },
}
