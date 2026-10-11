import type { UniqueIdentifier } from '@dnd-kit/core'
import { createContext, useContext } from 'react'
import type { DropSpot, Slot } from './layout'
import type { PanelDragData } from './types'

/** The drag in progress, shared by WorkspaceDnd (WorkspaceProvider) with the drop zones */
export type WorkspaceDrag = {
  /** What is being dragged, as it was when the drag started; null: nothing is */
  dragging: PanelDragData | null
}

export const WorkspaceDragContext = createContext<WorkspaceDrag>({ dragging: null })

export const useWorkspaceDrag = () => useContext(WorkspaceDragContext)

/** A drop zone's id (DropZones, for new panels): which slot, which spot on it, e.g. "b:left" */
export const dropId = (slot: Slot, spot: DropSpot) => `${slot}:${spot}`

/** A pane drop zone's id (not e.g. a sidebar row's) */
export const isPaneDropId = (id: UniqueIdentifier) => /^[abcd]:(left|right|top|bottom|center)$/.test(String(id))

export function parseDropId(id: UniqueIdentifier): { slot: Slot; spot: DropSpot } {
  const [slot, spot] = String(id).split(':') as [Slot, DropSpot]
  return { slot, spot }
}
