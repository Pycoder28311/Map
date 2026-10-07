import { useDroppable } from '@dnd-kit/core'
import type { DropSpot, Slot } from './layout'
import { dropPreviewStyle } from './paneStyles'
import { useWorkspace } from './useWorkspace'
import { dropId, useWorkspaceDrag } from './workspaceDrag'

// Full class strings so Tailwind can detect them at build time.
/** Area that catches the pointer: a third along each edge; the centre is the middle third (all of it
 *  when it's the only spot) */
const ZONE: Record<DropSpot, string> = {
  left: 'inset-y-0 left-0 w-1/3',
  right: 'inset-y-0 right-0 w-1/3',
  top: 'inset-x-0 top-0 h-1/3',
  bottom: 'inset-x-0 bottom-0 h-1/3',
  center: 'inset-1/3',
}
/** Preview of where the panel will go (centre: it takes this panel's whole place) */
const PREVIEW: Record<DropSpot, string> = {
  left: 'inset-y-0 left-0 w-1/2',
  right: 'inset-y-0 right-0 w-1/2',
  top: 'inset-x-0 top-0 h-1/2',
  bottom: 'inset-x-0 bottom-0 h-1/2',
  center: 'inset-0',
}

/** Drop targets on one slot (useWorkspace's dropSpots), shown only while something is being dragged */
export default function DropZones({ slot }: { slot: Slot }) {
  const { dragging } = useWorkspaceDrag()
  const { dropSpots } = useWorkspace()
  // New panels only: a dragged pane shows where it lands by re-arranging the panes (usePaneRearrange)
  const spots = dragging?.kind === 'new' ? dropSpots(slot, dragging) : []
  if (spots.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {spots.map((spot) => (
        <DropZone
          key={spot}
          slot={slot}
          spot={spot}
          only={spots.length === 1}
        />
      ))}
    </div>
  )
}

function DropZone({ slot, spot, only }: { slot: Slot; spot: DropSpot; only: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId(slot, spot) })
  return (
    <>
      <div ref={setNodeRef} className={`pointer-events-auto absolute ${only ? 'inset-0' : ZONE[spot]}`} />
      {isOver && (
        <div
          style={dropPreviewStyle}
          className={`absolute border-2 border-dashed border-fg-subtle bg-fg/10 ${PREVIEW[spot]}`}
        />
      )}
    </>
  )
}
