// One drop system for everything dragged (objects, layout tiles): droppables say which zone they
// belong to (data.zone: 'row', 'trash', 'link'…); each zone registers a handler that decides where a
// drag would land on it and what a drop does. ObjectDropProvider follows the drag and calls them;
// the current target is shared (useObjectDrop) so targets can highlight themselves.
import type { DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { createContext, useContext, useEffect, useRef } from 'react'
import type { ObjectDragInfo } from '../workspace/types'
import { objectOf } from './objectDrag'

/** Where a drag would land on a zone; `key` identifies it (a change of key = a new target) */
export type DropTargetValue = { key: string } & Record<string, unknown>

export type ZoneHandler = {
  /** The target under the drag now (`over` belongs to this zone), or null when it may not land there */
  target: (e: DragMoveEvent | DragOverEvent, item: ObjectDragInfo | undefined) => DropTargetValue | null
  /** Applies the drop; `float` is the floating copy (for the fall-into effects) */
  drop: (data: unknown, target: DropTargetValue, float: Element | null) => void
}

const zones = new Map<string, ZoneHandler>()

/** Registers what drops on a zone do (one handler per zone, e.g. in the component owning those targets) */
export function useDropZone(zone: string, handler: ZoneHandler) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => {
    zones.set(zone, { target: (e, item) => latest.current.target(e, item), drop: (d, t, f) => latest.current.drop(d, t, f) })
    return () => {
      zones.delete(zone)
    }
  }, [zone])
}

export type ObjectDropTarget = { zone: string; value: DropTargetValue }

export type ObjectDropState = {
  /** The object being dragged (null: nothing, or something that isn't an object, e.g. a pane) */
  item: ObjectDragInfo | null
  /** Where it would land now */
  target: ObjectDropTarget | null
}

export const ObjectDropContext = createContext<ObjectDropState>({ item: null, target: null })

export const useObjectDrop = () => useContext(ObjectDropContext)

/** The target under a drag: the zone of the droppable it's over, asked where it would land */
export function zoneTarget(e: DragMoveEvent | DragOverEvent): ObjectDropTarget | null {
  const zone = (e.over?.data.current as { zone?: string } | undefined)?.zone
  const handler = zone ? zones.get(zone) : undefined
  const value = handler?.target(e, objectOf(e.active.data.current)) ?? null
  return zone && value ? { zone, value } : null
}

/** Applies a drop on its target's zone */
export function applyDrop(data: unknown, target: ObjectDropTarget) {
  zones.get(target.zone)?.drop(data, target.value, document.querySelector('[data-drag-float]'))
}

export const sameDropTarget = (a: ObjectDropTarget | null, b: ObjectDropTarget | null) =>
  a === b || (a !== null && b !== null && a.zone === b.zone && a.value.key === b.value.key)
