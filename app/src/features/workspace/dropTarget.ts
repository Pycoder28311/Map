// Where a dragged pane would land, from the pointer's position: pure geometry (no DOM, no React), so
// it's easy to test (dropTarget.test.ts). Measured against the layout from before the drag, never
// against what's on screen: the live preview moves the panes, but never the targets under the pointer.
import { paneBox, SLOTS, type DropSpot, type Slot, type Template } from './layout'
import type { Split } from './split'

/** A point in the grid, as fractions of its width and height (0–1) */
export type GridPoint = { x: number; y: number }
type Box = { left: number; top: number; right: number; bottom: number }

/** How far in from an edge its drop spot reaches, as a part of the slot's size (as DropZones) */
const EDGE_REACH = 1 / 3

/** A slot's box (layout.ts: paneBox, so uneven halves of a 2×2 layout are followed too) */
function slotBox(template: Template, slot: Slot, split: Split): Box | null {
  const box = paneBox(template, slot, split)
  return box && { left: box.x0, top: box.y0, right: box.x1, bottom: box.y1 }
}

const inside = (box: Box, p: GridPoint) => p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom

/**
 * The spot of a box under a point, among the allowed ones: the nearest edge when the point is within
 * EDGE_REACH of it, else the centre. When the centre isn't allowed, the nearest allowed edge.
 */
function spotIn(box: Box, p: GridPoint, allowed: DropSpot[]): DropSpot | null {
  const u = (p.x - box.left) / (box.right - box.left)
  const v = (p.y - box.top) / (box.bottom - box.top)
  const distance: Record<Exclude<DropSpot, 'center'>, number> = { left: u, right: 1 - u, top: v, bottom: 1 - v }
  const edges = (Object.keys(distance) as (keyof typeof distance)[])
    .filter((edge) => allowed.includes(edge))
    .sort((a, b) => distance[a] - distance[b])
  const nearest = edges[0]
  if (nearest && distance[nearest] < EDGE_REACH) return nearest
  if (allowed.includes('center')) return 'center'
  return nearest ?? null
}

/** The slot and spot under a point, or null outside the grid or where nothing is allowed */
export function dropTargetAt(
  template: Template,
  split: Split,
  point: GridPoint,
  allowedSpots: (slot: Slot) => DropSpot[],
): { slot: Slot; spot: DropSpot } | null {
  for (const slot of SLOTS) {
    const box = slotBox(template, slot, split)
    if (!box || !inside(box, point)) continue
    const spot = spotIn(box, point, allowedSpots(slot))
    return spot ? { slot, spot } : null
  }
  return null
}
