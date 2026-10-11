// Dragging objects from anywhere (a sidebar row, a list row in a pane, a card…). One shape of drag
// data for all of them, so every drop target (sidebar rows, link nodes, the trash, pane edges) takes
// them the same way.
import { useDraggable } from '@dnd-kit/core'
import type { ObjectDragInfo, PanelDragData, PanelRef } from '../workspace/types'

/** The dragged object in a drag's data, if it's an object */
export function objectOf(data: unknown): ObjectDragInfo | undefined {
  const drag = data as PanelDragData | undefined
  return drag && (drag.kind === 'new' || drag.kind === 'object') ? drag.object : undefined
}

type Options = {
  /** Unique among draggables, e.g. "notes-list:n1" */
  id: string
  label: string
  object: ObjectDragInfo
  /** Its panel: it can then also be dropped on a pane's edge to open it there */
  panel?: PanelRef
  disabled?: boolean
}

/**
 * Makes an element drag an object: spread `listeners` and `attributes` on it and give it `setNodeRef`.
 * While dragging, the floating copy (DragFloat) takes the look of the surface under the pointer.
 */
export function useObjectDrag({ id, label, object, panel, disabled = false }: Options) {
  const data: PanelDragData = panel ? { kind: 'new', panel, label, object } : { kind: 'object', label, object }
  return useDraggable({ id, data, disabled })
}
