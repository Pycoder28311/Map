// Which droppable a drag is over when several are under the pointer: the one with the highest
// `data.priority` (link nodes 3, sidebar rows / cards / the trash 2, anything else, e.g. a pane's edge
// zones, 1). Without it, a pane's edge zones (which cover the whole pane) would take drops meant for
// the list inside it.
import { pointerWithin, rectIntersection, type Collision, type CollisionDetection } from '@dnd-kit/core'

/** A droppable's priority (data.priority; default 1) */
export const priorityOf = (collision: Collision) =>
  ((collision.data?.droppableContainer?.data?.current as { priority?: number } | undefined)?.priority ?? 1)

/** Mouse/touch: the droppables under the pointer; keyboard: those the dragged item overlaps. Highest priority first */
export const byPriority: CollisionDetection = (args) => {
  const hits = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)
  // Stable: among equals, dnd-kit's own order stays
  return hits.map((hit, i) => ({ hit, i })).sort((a, b) => priorityOf(b.hit) - priorityOf(a.hit) || a.i - b.i).map((x) => x.hit)
}
