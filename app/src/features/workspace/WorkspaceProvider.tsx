import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useState, type ReactNode } from 'react'
import { buttonClass } from '../../components/ui/buttons/buttonStyles'
import type { Edge, Slot } from './layout'
import { PanelRegistryContext } from './registryContext'
import type { PanelRef, PanelRegistry } from './types'
import { useWorkspace } from './useWorkspace'

/** Mouse/touch: the zone under the pointer. Keyboard (no pointer): the zone the dragged item overlaps */
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

/** What a draggable source carries (see PanelDragLink) */
export type PanelDragData = { panel: PanelRef; label: string }

/**
 * Makes the workspace available below it: the app's panel registry and one drag & drop context
 * shared by the drag sources (sidebar) and the drop zones (current page, panels).
 */
export default function WorkspaceProvider({ panels, children }: { panels: PanelRegistry; children: ReactNode }) {
  return (
    <PanelRegistryContext.Provider value={panels}>
      <WorkspaceDnd>{children}</WorkspaceDnd>
    </PanelRegistryContext.Provider>
  )
}

function WorkspaceDnd({ children }: { children: ReactNode }) {
  const { drop } = useWorkspace()
  const [dragging, setDragging] = useState<PanelDragData | null>(null)

  const sensors = useSensors(
    // 6 px before a drag starts, so a click on a sidebar link stays a click
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Space only: Enter must keep following the link
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  const onDragStart = ({ active }: DragStartEvent) => setDragging((active.data.current as PanelDragData) ?? null)
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null)
    const data = active.data.current as PanelDragData | undefined
    if (!data || !over) return
    const [slot, edge] = String(over.id).split(':') as [Slot, Edge]
    drop(data.panel, slot, edge)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {children}
      {/* What follows the pointer while dragging */}
      <DragOverlay dropAnimation={null}>
        {dragging && <div className={buttonClass('secondary', false, 'shadow-lg')}>{dragging.label}</div>}
      </DragOverlay>
    </DndContext>
  )
}
