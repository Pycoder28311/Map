// Cutting parts out of a line with the eraser's circle. Pure (erase.test.ts).
import type { Change } from './changes'
import { simplify } from '../projects/strokeCodec'
import { flattenedOf } from './pathGeometry'
import { pieceOfBorder } from './split'
import type { BorderObject, LineObject, Point } from './types'

/** How close the points of the path are made before erasing, as a part of the radius (so the circle can't step over one) */
const SPACING = 0.5

/** Points along the pointer's way, so a fast stroke leaves no gaps (a point every `radius * SPACING`) */
export function densify(points: Point[], spacing: number): Point[] {
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / spacing)
    for (let s = 1; s <= steps; s++) out.push({ x: a.x + ((b.x - a.x) * s) / steps, y: a.y + ((b.y - a.y) * s) / steps })
  }
  return out
}

/**
 * What is left of the path after the circle (`radius`) passed over `centres`: the pieces, each simplified. An untouched
 * path comes back as it is; nothing left: no pieces. A piece of one point is a dot.
 */
export function eraseFromPath(points: Point[], centres: Point[], radius: number): Point[][] {
  const dense = densify(points, Math.max(1, radius * SPACING))
  const near = (p: Point) => centres.some((c) => Math.hypot(p.x - c.x, p.y - c.y) <= radius)
  const pieces: Point[][] = []
  let run: Point[] = []
  let erased = false
  for (const p of dense) {
    if (near(p)) {
      erased = true
      if (run.length) pieces.push(run)
      run = []
    } else run.push(p)
  }
  if (!erased) return [points]
  if (run.length) pieces.push(run)
  return pieces.map((piece) => simplify(piece, 1))
}

/** A line that had curve handles is flattened by erasing: its pieces are plain exact lines */
const flatStyle = (line: LineObject) => (line.handles ? { ...line.style, way: 'exact' as const, amount: 0 } : line.style)

/** The line replaced by its pieces: kept (same id) when one is left, removed when none, else swapped for the pieces */
export function eraseChange(line: LineObject, pieces: Point[][]): Change {
  const untouched = pieces.length === 1 && (pieces[0] === line.points || pieces[0] === flattenedOf(line))
  if (untouched) return {}
  if (pieces.length === 1) return { update: [{ id: line.id, patch: { points: pieces[0], handles: undefined, style: flatStyle(line) } }] }
  const { id, ...rest } = line
  return { remove: [id], add: pieces.map((points) => ({ ...rest, points, handles: undefined, style: flatStyle(line) })) }
}

/** What is left of a border after the eraser: its pieces as open borders (an area with a hole in its outline is no area), or nothing */
export function eraseBorderChange(border: BorderObject, pieces: Point[][], source: Point[]): Change {
  if (pieces.length === 1 && pieces[0] === source) return {}
  return { remove: [border.id], add: pieces.map((points) => pieceOfBorder(border, points)) }
}

/** The eraser's circle (`radius`) having passed over `centres`, on a line or a border */
export function eraseObject(o: LineObject | BorderObject, centres: Point[], radius: number): Change {
  if (o.kind === 'line') return eraseChange(o, eraseFromPath(flattenedOf(o), centres, radius))
  const ring = flattenedOf(o)
  // An open border has no closing edge
  const source = o.open ? ring : [...ring, ring[0]]
  return eraseBorderChange(o, eraseFromPath(source, centres, radius), source)
}
