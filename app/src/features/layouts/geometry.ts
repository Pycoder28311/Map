// A layout's shape as fractions of its box (0–1): the lines between panes and each pane's place.
// From the workspace's own model (layout.ts), so a tile always matches the real panes.
import { borders, slotCells, SLOTS, type Template } from '../workspace/layout'
import type { Split } from '../workspace/split'

export type Line = { x1: number; y1: number; x2: number; y2: number }
export type Rect = { x0: number; y0: number; x1: number; y1: number }

/** The lines between panes, at the saved sizes (the same segments the workspace resizes) */
export function layoutLines(template: Template, split: Split): Line[] {
  const span = (part: 'start' | 'end' | 'whole', at: number): [number, number] =>
    part === 'start' ? [0, at] : part === 'end' ? [at, 1] : [0, 1]
  return borders(template).map(({ axis, part }) => {
    if (axis === 'x') {
      const [y1, y2] = span(part, split.y)
      return { x1: split.x, y1, x2: split.x, y2 }
    }
    const [x1, x2] = span(part, split.x)
    return { x1, y1: split.y, x2, y2: split.y }
  })
}

/** Where a pane (slot) sits: the union of its cells (0 1 / 2 3) */
export function slotRect(template: Template, slot: (typeof SLOTS)[number], split: Split): Rect {
  const cells = slotCells(template, slot)
  const cols = cells.map((c) => c % 2)
  const rows = cells.map((c) => Math.floor(c / 2))
  return {
    x0: Math.min(...cols) === 0 ? 0 : split.x,
    x1: Math.max(...cols) === 0 ? split.x : 1,
    y0: Math.min(...rows) === 0 ? 0 : split.y,
    y1: Math.max(...rows) === 0 ? split.y : 1,
  }
}

/**
 * Where a pane's label goes, as a direction out of the tile (-1, 0, 1 per axis), and the point of the
 * pane it points at: its outer corner for a corner pane, the middle of its outer side for a pane
 * spanning a whole side (the top for one filling everything)
 */
export function labelSpot(rect: Rect) {
  const wide = rect.x0 === 0 && rect.x1 === 1
  const tall = rect.y0 === 0 && rect.y1 === 1
  const dx = wide ? 0 : rect.x0 === 0 ? -1 : 1
  const dy = wide && tall ? -1 : tall ? 0 : rect.y0 === 0 ? -1 : 1
  return {
    dx,
    dy,
    x: dx < 0 ? rect.x0 : dx > 0 ? rect.x1 : (rect.x0 + rect.x1) / 2,
    y: dy < 0 ? rect.y0 : dy > 0 ? rect.y1 : (rect.y0 + rect.y1) / 2,
  }
}
