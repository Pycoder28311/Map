import { useDndMonitor, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core'
import { useRef, useState, type RefObject } from 'react'
import { dragPoint } from '../../lib/dnd'
import { useTimeout } from '../../lib/useTimeout'
import { dropTargetAt } from './dropTarget'
import { rearrange, workspaceHref, type DropSpot, type Slot, type WorkspaceLayout } from './layout'
import { snapshotPanes } from './paneFlip'
import type { Split } from './split'
import type { PanelDragData } from './types'
import { useWorkspace } from './useWorkspace'

/** The pointer must rest this long on a new target before the panes re-arrange (ms) */
const DWELL = 100

type Target = { slot: Slot; spot: DropSpot }
type PaneDrag = Extract<PanelDragData, { kind: 'pane' }>

const sameTarget = (a: Target | null, b: Target | null) => a?.slot === b?.slot && a?.spot === b?.spot

/**
 * Dragging a pane in the workspace grid: while it's held, the panes are shown arranged as if it were
 * dropped where the pointer is (`preview`); the drop commits that (the URL changes once).
 * - the target comes from the pointer and the layout from before the drag (dropTarget.ts), never from
 *   the panes on screen, so re-arranging them never changes what's under the pointer
 * - a short dwell before re-arranging, so passing over a pane on the way doesn't re-tile everything
 * - outside the grid, or back on its own place: the layout as it was
 * - on drop, the dropped arrangement stays on screen until the URL has it (`committed`), so the
 *   panes just stay where they are: never a frame of the old layout, nothing glides
 * Listens to the shared DndContext (useDndMonitor); sidebar drags are left to DropZones.
 */
export function usePaneRearrange(gridRef: RefObject<HTMLElement | null>, layout: WorkspaceLayout | null, split: Split) {
  const { dropSpots, rearrangePane } = useWorkspace()
  // Frozen at the start: the pane's own data (its slot) changes while the preview moves it
  const [drag, setDrag] = useState<PaneDrag | null>(null)
  const [target, setTarget] = useState<Target | null>(null)
  // Dropped, and the URL not updated yet: what to keep showing, and the layout it replaced
  const [committed, setCommitted] = useState<{ layout: WorkspaceLayout; replaced: string } | null>(null)
  const savedKey = layout ? workspaceHref(layout) : ''
  // The URL changed (to it, or anything else): the saved layout is what to show again
  if (committed && savedKey !== committed.replaced) setCommitted(null)
  // The target waiting for its dwell (or shown): a new one restarts the wait
  const aimed = useRef<Target | null>(null)
  const timer = useTimeout()

  /** The target under the pointer (keyboard drags: under the moved grip) */
  const targetOf = (pane: PaneDrag, e: DragMoveEvent): Target | null => {
    const grid = gridRef.current?.getBoundingClientRect()
    const pointer = dragPoint(e)
    if (!layout || !grid || !pointer) return null
    const point = { x: (pointer.x - grid.left) / grid.width, y: (pointer.y - grid.top) / grid.height }
    return dropTargetAt(layout.template, split, point, (slot) => dropSpots(slot, pane))
  }

  const aimAt = (next: Target | null) => {
    if (sameTarget(next, aimed.current)) return
    aimed.current = next
    timer.set(() => {
      // Where the panes are now, so they glide to their new places (paneFlip.ts)
      snapshotPanes()
      setTarget(next)
    }, DWELL)
  }

  const reset = () => {
    timer.clear()
    aimed.current = null
    setDrag(null)
    setTarget(null)
  }

  useDndMonitor({
    onDragStart: ({ active }: DragStartEvent) => {
      const data = active.data.current as PanelDragData | undefined
      if (data?.kind === 'pane') setDrag(data)
    },
    onDragMove: (e) => {
      if (drag) aimAt(targetOf(drag, e))
    },
    onDragEnd: (e) => {
      if (!drag) return
      // Where it is released, even if the dwell hasn't shown it yet
      const final = targetOf(drag, e)
      const next = final && layout && rearrange(layout, drag.from, final)
      reset()
      if (!final || !next) return
      setCommitted({ layout: next, replaced: savedKey })
      rearrangePane(drag.from, final)
    },
    onDragCancel: reset,
  })

  const dragging = drag && target && layout ? rearrange(layout, drag.from, target) : null
  return { preview: dragging ?? committed?.layout ?? null }
}
