// The arrow heads at the ends of a line. Pure (arrows.test.ts).
import type { Point } from './types'

export const ARROW_HEADS = ['open', 'triangle', 'diamond', 'circle', 'bar', 'chevrons'] as const
export type ArrowHead = (typeof ARROW_HEADS)[number]

export const ARROW_LABEL: Record<ArrowHead, string> = {
  open: 'Open arrow',
  triangle: 'Triangle',
  diamond: 'Diamond',
  circle: 'Circle',
  bar: 'Bar',
  chevrons: 'Double arrow',
}

export type HeadShape = { /** Polylines to draw; closed ones repeat nothing, `closed` joins last to first */ parts: Point[][]; closed: boolean; filled: boolean }

/** The default size of an arrow for a line of this thickness */
export const defaultArrowSize = (thickness: number) => Math.max(8, Math.round(thickness * 4))

/** How much of the line's end a head covers (the stroke stops there so it does not poke through a filled tip) */
export function headInset(head: ArrowHead, size: number): number {
  return head === 'triangle' ? size * 0.8 : head === 'diamond' || head === 'circle' ? size * 0.5 : 0
}

/** The head with its tip at `tip`, pointing along `angle` (radians, the line's direction at that end, outward) */
export function arrowHead(head: ArrowHead, tip: Point, angle: number, size: number): HeadShape {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  // Local coordinates: x along the line toward the tip (tip at 0, the head behind it at negative x), y across
  const at = (x: number, y: number): Point => ({ x: tip.x + x * cos - y * sin, y: tip.y + x * sin + y * cos })
  const s = size
  switch (head) {
    case 'open':
      return { parts: [[at(-s, -s * 0.5), at(0, 0), at(-s, s * 0.5)]], closed: false, filled: false }
    case 'triangle':
      return { parts: [[at(0, 0), at(-s, -s * 0.5), at(-s, s * 0.5)]], closed: true, filled: true }
    case 'diamond':
      return { parts: [[at(0, 0), at(-s * 0.5, -s * 0.35), at(-s, 0), at(-s * 0.5, s * 0.35)]], closed: true, filled: true }
    case 'circle': {
      const r = s * 0.25
      const centre = at(-r, 0)
      return { parts: [Array.from({ length: 16 }, (_, i) => ({ x: centre.x + r * Math.cos((i * Math.PI) / 8), y: centre.y + r * Math.sin((i * Math.PI) / 8) }))], closed: true, filled: true }
    }
    case 'bar':
      return { parts: [[at(0, -s * 0.5), at(0, s * 0.5)]], closed: false, filled: false }
    case 'chevrons':
      return {
        parts: [
          [at(-s * 0.5, -s * 0.4), at(0, 0), at(-s * 0.5, s * 0.4)],
          [at(-s, -s * 0.4), at(-s * 0.5, 0), at(-s, s * 0.4)],
        ],
        closed: false,
        filled: false,
      }
  }
}

/** The direction (radians) the line leaves its start and enters its end, or null for a dot */
export function endTangents(polyline: Point[]): { start: number; end: number } | null {
  const distinct = polyline.filter((p, i) => i === 0 || p.x !== polyline[i - 1].x || p.y !== polyline[i - 1].y)
  if (distinct.length < 2) return null
  // Look a little way in (not at the last sample), so a hooked end does not point sideways
  const first = distinct[0]
  const last = distinct[distinct.length - 1]
  const near = (from: Point, order: Point[]) => order.find((p) => Math.hypot(p.x - from.x, p.y - from.y) >= 3) ?? order[order.length - 1]
  const startTo = near(first, distinct)
  const endFrom = near(last, [...distinct].reverse())
  return { start: Math.atan2(first.y - startTo.y, first.x - startTo.x), end: Math.atan2(last.y - endFrom.y, last.x - endFrom.x) }
}
