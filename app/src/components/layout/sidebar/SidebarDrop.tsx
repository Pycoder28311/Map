import { useDndMonitor, type DragMoveEvent, type DragOverEvent } from '@dnd-kit/core'
import { useRef, useState, type ReactNode } from 'react'
import { drop, sameTarget, SidebarDropContext, targetOf, treeInfo, type SidebarDrop, type SidebarDropTarget } from './sidebarDropState'

/**
 * Drag & drop inside the sidebar (rows and the trash bin), on the app's one drag context
 * (WorkspaceProvider): follows the drag to show where it would land, and applies the drop. Drops on
 * panes stay with the workspace.
 */
export default function SidebarDropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SidebarDrop>({ draggingNodeId: null, target: null })
  const targetRef = useRef<SidebarDropTarget>(null)

  const follow = (e: DragMoveEvent | DragOverEvent) => {
    const target = targetOf(e)
    if (sameTarget(targetRef.current, target)) return
    targetRef.current = target
    setState((s) => ({ ...s, target }))
  }
  const reset = () => {
    targetRef.current = null
    setState({ draggingNodeId: null, target: null })
  }

  useDndMonitor({
    onDragStart: ({ active }) => {
      targetRef.current = null
      setState({ draggingNodeId: treeInfo(active.data.current)?.nodeId ?? null, target: null })
    },
    onDragMove: follow,
    onDragOver: follow,
    onDragEnd: ({ active }) => {
      const target = targetRef.current
      drop(active.data.current, target)
      reset()
    },
    onDragCancel: reset,
  })

  return <SidebarDropContext.Provider value={state}>{children}</SidebarDropContext.Provider>
}
