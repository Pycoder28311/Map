// Mirror drawing: with a mirror on, what is drawn on one side is drawn on the other too, across the board's middle (left ↔ right, top ↔
// bottom, or both: four copies). Units only: a unit x mirrors to width − 1 − x, a box at x, w units wide to width − x − w.
import { newId, type ShapeItem } from './types'

export type Mirror = { x: boolean; y: boolean }

/** A unit and its mirror copies (no duplicates: a unit on the middle line is its own copy) */
export function mirrorPoints(x: number, y: number, width: number, height: number, mirror: Mirror): [number, number][] {
  const points: [number, number][] = [[x, y]]
  if (mirror.x) points.push([width - 1 - x, y])
  if (mirror.y) points.push([x, height - 1 - y])
  if (mirror.x && mirror.y) points.push([width - 1 - x, height - 1 - y])
  const seen = new Set<string>()
  return points.filter(([px, py]) => {
    const key = `${px},${py}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** A shape's mirror copy across one axis ('x': left ↔ right; 'y': top ↔ bottom). A text's letters are not flipped: it stays readable */
export function mirrorShape(item: ShapeItem, axis: 'x' | 'y', width: number, height: number, textW = 0, textH = 0): ShapeItem {
  const id = newId(item.kind)
  if (item.kind === 'line')
    return axis === 'x'
      ? { ...item, id, x1: width - 1 - item.x1, x2: width - 1 - item.x2 }
      : { ...item, id, y1: height - 1 - item.y1, y2: height - 1 - item.y2 }
  const w = item.kind === 'text' ? textW : item.w
  const h = item.kind === 'text' ? textH : item.h
  if (axis === 'x') {
    const copy = { ...item, id, x: width - item.x - w }
    if (item.kind === 'text') return { ...copy, align: item.align === 'left' ? 'right' : item.align === 'right' ? 'left' : 'center' } as ShapeItem
    return copy
  }
  return { ...item, id, y: height - item.y - h }
}

/** A new shape's mirror copies, as the mirror settings ask (none, one or three) */
export function mirrorCopies(item: ShapeItem, mirror: Mirror, width: number, height: number, textW = 0, textH = 0): ShapeItem[] {
  const out: ShapeItem[] = []
  if (mirror.x) out.push(mirrorShape(item, 'x', width, height, textW, textH))
  if (mirror.y) out.push(mirrorShape(item, 'y', width, height, textW, textH))
  if (mirror.x && mirror.y) out.push(mirrorShape(mirrorShape(item, 'x', width, height, textW, textH), 'y', width, height, textW, textH))
  return out
}
