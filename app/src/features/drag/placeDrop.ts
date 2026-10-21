// Dropping an object somewhere in an ordered list moves it there (the 'place' zone of the drop system, objectDrop.ts): before or
// after a Dashboard card or a sidebar row, at the end of a Dashboard row, or into a project or folder row of the sidebar (as its last
// child). When it comes from another list it also takes that list's parent (a project's row; the Orphans row: none). The new place
// is a key between the neighbours (lib/resource/reorder.ts), sent through the resource's update in one request: shown at once, put
// back if the server refuses.
import type { DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { dropIconOf, fallInto } from '../../components/ui/drop/fallInto'
import { dragPoint } from '../../lib/dnd'
import { endIndex, moveItem, placement, sameEntry, type Entry, type MovePlan } from '../../lib/resource/reorder'
import { resourceByName, resourceByPanelType } from '../../resources/registry'
import type { ObjectDragInfo } from '../workspace/types'
import { reducedMotion, TIMING } from '../../components/ui/tree/dragEffects'
import { beginGlide, playGlide, playReflow, snapshotReflow } from './glide'
import { holdFaded, releaseFaded } from './held'
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
  /** Only these resources sit in the list (the sidebar's projects and orphans); the others go inside a row or out of their parent */
  accepts?: string[]
  /** A row that can be a parent: dropped in its middle, the item becomes its last child */
  into?: { parent: NonNullable<PlaceParent>; list: () => Entry[] }
  /** The sidebar row (its highlight and the fall-in effect) */
  nodeId?: string
  /** The Dashboard row it is in */
  rowId?: string
}

// A card lies over its Dashboard row: it wins (priority 3), the row (2) takes the rest of its area. Sidebar rows: 2, as before
export const placeDropData = (target: PlaceTarget) => ({ zone: PLACE_ZONE, priority: target.kind === 'card' ? 3 : 2, ...target })

/** `out`: out of its parent, to none (let go between two parents) */
export type PlaceSide = 'before' | 'after' | 'into' | 'end' | 'out'

/** What a drop here would do: the place (its key: what is highlighted) and the update it makes */
export type PlaceValue = {
  key: string
  side: PlaceSide
  nodeId?: string
  /** `<resource>:<id>` of the card the bar is drawn by, or `row:<id>` for the end of a row */
  mark: string
  moved: Entry
  place: MovePlan
  /** `out`: the edge of the row it was let go by, where the line is drawn */
  edge?: 'before' | 'after'
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
  // A row of a section that takes only its own resource (the Projects) takes any other one inside it: its middle is "into". An item that
  // is inside a parent and is let go by the row's top or bottom edge (between two parents, not between children) leaves its parent
  const sits = target.accepts ?? (target.only ? [target.only] : undefined)
  if (sits && !sits.includes(moved.resource.name)) {
    const edge = side === 'before' || side === 'after' ? side : null
    if (edge && current && current.type !== null && moved.resource.parents?.length) {
      return { side: 'out', edge, moved, place: { fixes: [] }, parent: null }
    }
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

/** The drop key of a parent's icon in the sidebar (its row's id: a top-level row, or inside its parent's rows), when it is on screen */
function sidebarIconOf(parent: NonNullable<PlaceParent>): string | undefined {
  const panelType = resourceByName(parent.resource)?.panelType
  if (!panelType) return undefined
  const own = `${panelType}-${parent.id}`
  return [...document.querySelectorAll('[data-drop-icon]')].map((el) => el.getAttribute('data-drop-icon') ?? '').find((key) => key === own || key.endsWith(`/${own}`))
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
    const value: PlaceValue = { ...resolved, key: `${target.nodeId ?? mark}:${resolved.edge ?? resolved.side}`, mark, nodeId: target.nodeId }
    return value
  },
  drop: (data, target, float) => {
    const value = target as unknown as PlaceValue
    const object = objectOf(data)
    if (!object) return
    // Into a new parent it falls into that parent's icon: the row it was dropped on, or (dropped in a Dashboard row) the parent's row in
    // the sidebar. Otherwise its faded copy slides to where it landed (glide.ts)
    const iconKey = value.side === 'into' && value.nodeId ? value.nodeId : value.parent ? sidebarIconOf(value.parent) : undefined
    const falls = iconKey !== undefined && float !== null && dropIconOf(iconKey) !== null
    if (falls) fallInto(float, iconKey, { lifted: true })
    const key = `${object.kind}:${object.objectId}`
    const parent = value.parent === undefined ? undefined : value.parent && { type: value.parent.type, id: Number(value.parent.id) }
    const send = () =>
      moveItem(value.moved, value.place, parent).catch((error) => console.error(`Could not move the ${value.moved.resource.ui.label.toLowerCase()}`, error))

    // The faded copy stays where it was until the dragged one is in the parent (not when the pointer is let go), then the move shows
    if (falls && !reducedMotion()) {
      holdFaded(key, object.nodeId)
      window.setTimeout(() => {
        releaseFaded(key)
        const reflow = snapshotReflow(key)
        void send()
        if (reflow) playReflow(reflow)
      }, TIMING.openLead + TIMING.swallow)
      return
    }
    const glide = falls ? null : beginGlide(object, float)
    // The others make room smoothly too
    const reflow = snapshotReflow(key)
    void send()
    if (glide) playGlide(glide)
    if (reflow) playReflow(reflow)
  },
}
