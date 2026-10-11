// A layout's shape as fractions of its box (0–1): the lines between panes and each pane's place.
// From the workspace's own model (layout.ts), so a tile always matches the real panes.
import { paneBox, segmentValue, splitFor, splitSegments, SLOTS, type Template } from '../workspace/layout'
import type { Split } from '../workspace/split'

export type Line = { x1: number; y1: number; x2: number; y2: number }
export type Rect = { x0: number; y0: number; x1: number; y1: number }

/**
 * The lines between panes, at the saved sizes: the same segments the workspace resizes (a 2×2 layout's
 * uneven halves included)
 */
export function layoutLines(template: Template, raw: Split): Line[] {
  const split = splitFor(template, raw)
  const span = (part: 'start' | 'end' | 'whole', at: number): [number, number] =>
    part === 'start' ? [0, at] : part === 'end' ? [at, 1] : [0, 1]
  return splitSegments(template, split).segments.map(({ id, axis, part }) => {
    const at = segmentValue(split, id)
    if (axis === 'x') {
      const [y1, y2] = span(part, split.y)
      return { x1: at, y1, x2: at, y2 }
    }
    const [x1, x2] = span(part, split.x)
    return { x1, y1: at, x2, y2: at }
  })
}

/** Where a pane (slot) sits (layout.ts: paneBox) */
export function slotRect(template: Template, slot: (typeof SLOTS)[number], split: Split): Rect {
  return paneBox(template, slot, split) ?? { x0: 0, y0: 0, x1: 0, y1: 0 }
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
