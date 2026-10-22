import { useDndMonitor, type DragMoveEvent, type DragOverEvent } from '@dnd-kit/core'
import { swallowClickAfterDrag } from '../../lib/dnd'
import { useRef, useState, type ReactNode } from 'react'
import { objectOf } from './objectDrag'
import { applyDrop, ObjectDropContext, sameDropTarget, zoneTarget, type ObjectDropState, type ObjectDropTarget } from './objectDrop'

/**
 * Follows every drag on the app's drag context: shares what's dragged and where it would land
 * (useObjectDrop), and applies the drop on that zone (objectDrop.ts). Drops on pane edges stay with
 * the workspace.
 */
export default function ObjectDropProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ObjectDropState>({ item: null, target: null })
  const targetRef = useRef<ObjectDropTarget | null>(null)

  const follow = (e: DragMoveEvent | DragOverEvent) => {
    const target = zoneTarget(e)
    if (sameDropTarget(targetRef.current, target)) return
    targetRef.current = target
    setState((s) => ({ ...s, target }))
  }
  const reset = () => {
    targetRef.current = null
    setState({ item: null, target: null })
  }

  useDndMonitor({
    onDragStart: ({ active }) => {
      targetRef.current = null
      setState({ item: objectOf(active.data.current) ?? null, target: null })
    },
    onDragMove: follow,
    onDragOver: follow,
    onDragEnd: ({ active }) => {
      const target = targetRef.current
      if (target) applyDrop(active.data.current, target)
      swallowClickAfterDrag()
      reset()
    },
    onDragCancel: () => {
      swallowClickAfterDrag()
      reset()
    },
  })

  return <ObjectDropContext.Provider value={state}>{children}</ObjectDropContext.Provider>
}
