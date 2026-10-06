import { useDndContext, useDroppable } from '@dnd-kit/core'
import { allowedEdges, type Edge, type Slot } from './layout'
import { useWorkspace } from './useWorkspace'

// Full class strings so Tailwind can detect them at build time.
/** Area that catches the pointer, along each edge */
const ZONE: Record<Edge, string> = {
  left: 'inset-y-0 left-0 w-1/3',
  right: 'inset-y-0 right-0 w-1/3',
  top: 'inset-x-0 top-0 h-1/3',
  bottom: 'inset-x-0 bottom-0 h-1/3',
}
/** Preview of where the panel will go */
const PREVIEW: Record<Edge, string> = {
  left: 'inset-y-0 left-0 w-1/2',
  right: 'inset-y-0 right-0 w-1/2',
  top: 'inset-x-0 top-0 h-1/2',
  bottom: 'inset-x-0 bottom-0 h-1/2',
}

/** Drop targets on the edges of one slot; shown only while something draggable is being dragged */
export default function DropZones({ slot, enabled }: { slot: Slot; enabled: boolean }) {
  const { active } = useDndContext()
  const { layout } = useWorkspace()
  if (!active || !enabled || !layout) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {allowedEdges(layout, slot).map((edge) => (
        <DropZone key={edge} slot={slot} edge={edge} />
      ))}
    </div>
  )
}

function DropZone({ slot, edge }: { slot: Slot; edge: Edge }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${slot}:${edge}` })
  return (
    <>
      <div ref={setNodeRef} className={`pointer-events-auto absolute ${ZONE[edge]}`} />
      {isOver && (
        <div
          className={`absolute rounded-(--card-radius) border-2 border-dashed border-gray-500 bg-gray-900/10 ${PREVIEW[edge]}`}
        />
      )}
    </>
  )
}
