import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useEffect, useState, type ReactNode } from 'react'
import { buttonClass } from '../../components/ui/buttons/buttonStyles'
import { BackgroundPointerSensor, followPointer } from '../../lib/dnd'
import { byPriority } from '../drag/collision'
import DragFloat from '../drag/DragFloat'
import { objectOf } from '../drag/objectDrag'
import ObjectDropProvider from '../drag/ObjectDropProvider'
import { PanelRegistryContext } from './registryContext'
import type { PanelDragData, PanelRegistry } from './types'
import { useWorkspace } from './useWorkspace'
import { isPaneDropId, parseDropId, WorkspaceDragContext } from './workspaceDrag'

/**
 * Makes the workspace available below it: the app's panel registry and one drag & drop context
 * shared by the drag sources (sidebar items, panes' grips) and the drop zones (current page, panels),
 * and the drag in progress (workspaceDrag.ts). Panes dragged within the grid: usePaneRearrange.
 * Dragged objects (from the sidebar, lists in panes…) float as DragFloat and drop through
 * ObjectDropProvider's zones (sidebar rows, link nodes, the trash); onto pane edges, here.
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

  // While anything is dragged, <html data-dragging>: lists turn off their hover effects
  useEffect(() => {
    document.documentElement.toggleAttribute('data-dragging', dragging !== null)
  }, [dragging])

  const onDragStart = ({ active }: DragStartEvent) => setDragging((active.data.current as PanelDragData) ?? null)
  const onDragEnd = ({ over }: DragEndEvent) => {
    const drag = dragging
    setDragging(null)
    // Panes are handled by the grid itself (usePaneRearrange); other drops by their zones (ObjectDropProvider)
    if (drag?.kind !== 'new' || !over || !isPaneDropId(over.id)) return
    const { slot, spot } = parseDropId(over.id)
    dropNew(drag.panel, slot, spot)
  }

  return (
    <DndContext
      sensors={sensors}
      // Among the droppables under the pointer, the highest priority (link nodes, rows… before pane edges)
      collisionDetection={byPriority}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <WorkspaceDragContext.Provider value={{ dragging }}>
        <ObjectDropProvider>{children}</ObjectDropProvider>
      </WorkspaceDragContext.Provider>
      {/* A dragged object: the floating copy (keeps the grab point, looks like the surface it's over) */}
      <DragFloat />
      {/* Anything else (a pane, a layout tile…): a label next to the pointer */}
      <DragOverlay dropAnimation={null} modifiers={[followPointer]}>
        {dragging && !objectOf(dragging) && (
          <div className={buttonClass('secondary', false, 'shadow-lg')}>{dragging.label}</div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
