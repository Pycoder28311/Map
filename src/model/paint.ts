// Painting on the paint layer: the brush and the eraser stamp along a stroke, the fill bucket floods an area. They change the cells they are
// given (a stroke's own copy, made when the stroke starts: the drawing in the history is never changed) and report whether anything changed.
import { mirrorPoints, type Mirror } from './mirror'
import { linePoints, roundStamp, squareStamp } from './raster'
import type { Hex } from './types'

export type BrushShape = 'square' | 'round'

export const stampOf = (shape: BrushShape, size: number) => (shape === 'round' ? roundStamp(size) : squareStamp(size))

/**
 * The brush (a colour) or the eraser (null) from one unit to the next, with no gaps, and on its mirror copies. Returns whether a cell changed
 */
export function stroke(
  cells: (Hex | null)[],
  width: number,
  height: number,
  from: [number, number],
  to: [number, number],
  stamp: [number, number][],
  color: Hex | null,
  mirror: Mirror,
): boolean {
  let changed = false
  for (const [px, py] of linePoints(from[0], from[1], to[0], to[1]))
    for (const [mx, my] of mirrorPoints(px, py, width, height, mirror))
      for (const [dx, dy] of stamp) {
        const x = mx + dx
        const y = my + dy
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        const i = y * width + x
        if (cells[i] !== color) {
          cells[i] = color
          changed = true
        }
      }
  return changed
}

/**
 * The fill bucket: every unit joined to (x, y) by its 4 sides that looks the same colour (`seen`: the drawing flattened) gets `color` on the
 * paint layer. Returns whether a cell changed
 */
export function floodFill(cells: (Hex | null)[], seen: (Hex | null)[], width: number, height: number, x: number, y: number, color: Hex): boolean {
  const start = y * width + x
  const target = seen[start]
  if (target === color) return false
  const visited = new Uint8Array(width * height)
  const stack = [start]
  visited[start] = 1
  let changed = false
  while (stack.length) {
    const i = stack.pop()!
    if (cells[i] !== color) {
      cells[i] = color
      changed = true
    }
    const cx = i % width
    const cy = (i - cx) / width
    const next = [cx > 0 ? i - 1 : -1, cx < width - 1 ? i + 1 : -1, cy > 0 ? i - width : -1, cy < height - 1 ? i + width : -1]
    for (const n of next) {
      if (n < 0 || visited[n] || seen[n] !== target) continue
      visited[n] = 1
      stack.push(n)
    }
  }
  return changed
}
