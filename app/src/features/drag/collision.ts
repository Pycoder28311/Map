// Which droppable a drag is over when several are under the pointer: the one with the highest
// `data.priority` (link nodes and Dashboard cards 3; sidebar rows, Dashboard rows and the trash 2; anything else, e.g. a pane's edge
// zones, 1). Without it, a pane's edge zones (which cover the whole pane) would take drops meant for
// the list inside it.
import { pointerWithin, rectIntersection, type Collision, type CollisionDetection } from '@dnd-kit/core'

/** A droppable's priority (data.priority; default 1) */
export const priorityOf = (collision: Collision) =>
  ((collision.data?.droppableContainer?.data?.current as { priority?: number } | undefined)?.priority ?? 1)

/** How far beside a row or card (px) the gap between it and its neighbour counts as it: a line "between" two things shows over the gap */
export const GAP_REACH = 6

type Box = { left: number; top: number; right: number; bottom: number }

/** How far a point is from a box (0 inside it), or null when it is farther than `reach` on either axis */
export function distanceBeyond(point: { x: number; y: number }, box: Box, reach: number): number | null {
  const dx = Math.max(box.left - point.x, 0, point.x - box.right)
  const dy = Math.max(box.top - point.y, 0, point.y - box.bottom)
  return dx > reach || dy > reach ? null : Math.hypot(dx, dy)
}

/**
 * When the pointer is in the gap between two rows or cards (over no place at all), the nearest place within GAP_REACH of it: dropping
 * there puts the object before or after that neighbour, and its insertion line shows. Null when there is none.
 */
const nearGap: CollisionDetection = ({ pointerCoordinates, droppableContainers, droppableRects }) => {
  if (!pointerCoordinates) return []
  let best: { container: (typeof droppableContainers)[number]; distance: number } | null = null
  for (const container of droppableContainers) {
    const data = container.data.current as { zone?: string; kind?: string } | undefined
    // A Dashboard row (kind row) is a big area of its own: its "gap" is just the page around it
    if (container.disabled || data?.zone !== 'place' || data.kind === 'row') continue
    const rect = droppableRects.get(container.id)
    if (!rect) continue
    const distance = distanceBeyond(pointerCoordinates, { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }, GAP_REACH)
    if (distance !== null && (!best || distance < best.distance)) best = { container, distance }
  }
  return best ? [{ id: best.container.id, data: { droppableContainer: best.container, value: best.distance } }] : []
}

/** Mouse/touch: the droppables under the pointer; keyboard: those the dragged item overlaps. Highest priority first */
export const byPriority: CollisionDetection = (args) => {
  const hits = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args)
  // Stable: among equals, dnd-kit's own order stays
  const sorted = hits.map((hit, i) => ({ hit, i })).sort((a, b) => priorityOf(b.hit) - priorityOf(a.hit) || a.i - b.i).map((x) => x.hit)
  // Between two rows (over nothing that takes the object): the nearest row's edge
  if (args.pointerCoordinates && !sorted.some((hit) => priorityOf(hit) >= 2)) return [...nearGap(args), ...sorted]
  return sorted
}
