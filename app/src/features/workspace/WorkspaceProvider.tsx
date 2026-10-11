import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
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
import { MOTION } from '../../components/ui/tree/dragEffects'
import LiftedRow from '../../components/ui/tree/LiftedRow'
import { BackgroundPointerSensor, followPointer, rowInColumn } from '../../lib/dnd'
import { PanelRegistryContext } from './registryContext'
import type { PanelDragData, PanelRegistry } from './types'
import { useWorkspace } from './useWorkspace'
import { isPaneDropId, parseDropId, WorkspaceDragContext } from './workspaceDrag'

/** A sidebar row being dragged stays in the sidebar's column while over it */
const sidebarRow = rowInColumn('#sidebar', MOTION.dragNudge)

/** Mouse/touch: the zone under the pointer. Keyboard (no pointer): the zone the dragged item overlaps */
const collisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)

/**
 * Makes the workspace available below it: the app's panel registry and one drag & drop context
 * shared by the drag sources (sidebar items, panes' grips) and the drop zones (current page, panels),
 * and the drag in progress (workspaceDrag.ts). Panes dragged within the grid: usePaneRearrange.
 * Drops inside the sidebar (rows, trash) are handled by the sidebar itself (useDndMonitor).
 */
export default function WorkspaceProvider({ panels, children }: { panels: PanelRegistry; children: ReactNode }) {
  return (
    <PanelRegistryContext.Provider value={panels}>
      <WorkspaceDnd>{children}</WorkspaceDnd>
    </PanelRegistryContext.Provider>
  )
}

function WorkspaceDnd({ children }: { children: ReactNode }) {
  const { dropNew } = useWorkspace()
  const [dragging, setDragging] = useState<PanelDragData | null>(null)

  const sensors = useSensors(
    // 6 px before a drag starts, so a click stays a click. From a pane: its background or grip only
    // (its buttons, fields, map… keep the pointer)
    useSensor(BackgroundPointerSensor, { activationConstraint: { distance: 6 } }),
    // Space only: Enter must keep following the link
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } }),
  )

  // A sidebar row being dragged
  const tree = dragging && (dragging.kind === 'new' || dragging.kind === 'tree') ? dragging.tree : undefined

  const onDragStart = ({ active }: DragStartEvent) => setDragging((active.data.current as PanelDragData) ?? null)
  const onDragEnd = ({ over }: DragEndEvent) => {
    const drag = dragging
    setDragging(null)
    // Panes are handled by the grid itself (usePaneRearrange); sidebar drops by the sidebar
    if (drag?.kind !== 'new' || !over || !isPaneDropId(over.id)) return
    const { slot, spot } = parseDropId(over.id)
    dropNew(drag.panel, slot, spot)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <WorkspaceDragContext.Provider value={{ dragging }}>{children}</WorkspaceDragContext.Provider>
      {/* What follows the pointer while dragging (next to it, wherever the item was grabbed) */}
      <DragOverlay dropAnimation={null} modifiers={[tree ? sidebarRow : followPointer]}>
        {tree && dragging ? (
          // A sidebar row: lifted like the Zen sidebar's
          <LiftedRow label={dragging.label} icon={tree.icon} />
        ) : (
          dragging && <div className={buttonClass('secondary', false, 'shadow-lg')}>{dragging.label}</div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
