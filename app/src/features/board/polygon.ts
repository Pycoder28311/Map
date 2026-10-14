// Closed outlines ("rings") and the union of two of them: what merging two borders into one area needs.
// Pure (polygon.test.ts). A ring is a list of points; its last point joins its first.
import type { Point } from './types'

export type Ring = Point[]

const EPS = 1e-9

export function signedArea(ring: Ring): number {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export const areaOf = (ring: Ring) => Math.abs(signedArea(ring))

/** Whether `p` is inside the ring (the boundary itself is not reliably either) */
export function containsPoint(ring: Ring, p: Point): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/** The closest point of the segment a–b to p, and how far along it (0–1) */
export function closestOnSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2))
  const point = { x: a.x + t * dx, y: a.y + t * dy }
  return { t, point, distance: Math.hypot(p.x - point.x, p.y - point.y) }
}

/** Where the segments a–b and c–d cross, with how far along each (0–1); null for parallel or apart */
export function segmentIntersection(a: Point, b: Point, c: Point, d: Point): { point: Point; t: number; u: number } | null {
  const rx = b.x - a.x
  const ry = b.y - a.y
  const sx = d.x - c.x
  const sy = d.y - c.y
  const denominator = rx * sy - ry * sx
  if (Math.abs(denominator) < EPS) return null
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator
  if (t < 0 || t > 1 || u < 0 || u > 1) return null
  return { point: { x: a.x + t * rx, y: a.y + t * ry }, t, u }
}

/** The nearest vertex of the ring within `tolerance`, else the nearest point of an edge within it, else null */
export function snapToRing(p: Point, ring: Ring, tolerance: number): Point | null {
  let best: Point | null = null
  let bestDistance = tolerance
  for (const v of ring) {
    const d = Math.hypot(p.x - v.x, p.y - v.y)
    if (d <= bestDistance) {
      best = v
      bestDistance = d
    }
  }
  if (best) return best
  for (let i = 0; i < ring.length; i++) {
    const near = closestOnSegment(p, ring[i], ring[(i + 1) % ring.length])
    if (near.distance <= bestDistance) {
      best = near.point
      bestDistance = near.distance
    }
  }
  return best
}

/** How far `p` is from the ring's outline */
export function distanceToRing(p: Point, ring: Ring): number {
  let best = Infinity
  for (let i = 0; i < ring.length; i++) best = Math.min(best, closestOnSegment(p, ring[i], ring[(i + 1) % ring.length]).distance)
  return best
}

const key = (p: Point) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`

type Tagged = { points: Ring; tags: string[] }

/**
 * Counter-clockwise, no repeated points, no repeated first point at the end. `tags[i]` goes with the edge from point i to
 * the next; it follows its edge through the reversing and the dropping of repeats
 */
function normalised(points: Ring, tags: string[]): Tagged {
  const pts: Ring = []
  const kept: string[] = []
  for (let i = 0; i < points.length; i++) {
    if (pts.length > 0 && key(pts[pts.length - 1]) === key(points[i])) {
      // A zero-length edge (the previous point to this one) goes; the edge that leaves this point now leaves the earlier one
      kept[kept.length - 1] = tags[i]
      continue
    }
    pts.push(points[i])
    kept.push(tags[i])
  }
  if (pts.length > 1 && key(pts[0]) === key(pts[pts.length - 1])) {
    pts.pop()
    kept.pop()
  }
  if (signedArea(pts) >= 0) return { points: pts, tags: kept }
  const n = pts.length
  return { points: [...pts].reverse(), tags: pts.map((_, k) => kept[(n - 2 - k + 2 * n) % n]) }
}

/** `ring` with its vertices moved onto `onto`'s vertices or edges when within `tolerance` */
function snapped(ring: Ring, onto: Ring, tolerance: number): Ring {
  return ring.map((p) => snapToRing(p, onto, tolerance) ?? p)
}

type Piece = { from: Point; to: Point; origin: 'a' | 'b'; tag: string }

/** The ring's edges, each cut at every point of `cuts` that lies on it (within `tolerance`), in order along the edge */
function cutEdges(ring: Ring, tags: string[], cuts: Point[], origin: 'a' | 'b', tolerance: number): Piece[] {
  const pieces: Piece[] = []
  for (let i = 0; i < ring.length; i++) {
    const from = ring[i]
    const to = ring[(i + 1) % ring.length]
    const on = cuts
      .map((p) => ({ p, ...closestOnSegment(p, from, to) }))
      .filter((c) => c.distance <= tolerance && c.t > 1e-9 && c.t < 1 - 1e-9 && key(c.p) !== key(from) && key(c.p) !== key(to))
      .sort((x, y) => x.t - y.t)
    let last = from
    for (const c of on) {
      if (key(c.p) === key(last)) continue
      pieces.push({ from: last, to: c.p, origin, tag: tags[i] })
      last = c.p
    }
    pieces.push({ from: last, to, origin, tag: tags[i] })
  }
  return pieces
}

/**
 * The union of two rings as one ring, with the ring each of its edges came from (`origin[i]` is the edge from `ring[i]`
 * to the next point) and its tag (`tags[i]`: what the caller attached to the edge it came from, e.g. its colour). Vertices within `tolerance` of the other ring's outline are first moved onto it, so rings that
 * only nearly touch really share their edge. Null when it cannot be done reliably: apart, one inside the other, only a
 * corner in common, or a result with a hole or two parts. A null result means "do not merge", never an error.
 */
export function unionPolygons(
  first: Ring,
  second: Ring,
  tolerance: number,
  tagsFirst: string[] = first.map(() => ''),
  tagsSecond: string[] = second.map(() => ''),
): { ring: Ring; origin: ('a' | 'b')[]; tags: string[] } | null {
  let ta = normalised(first, tagsFirst)
  let tb = normalised(second, tagsSecond)
  if (ta.points.length < 3 || tb.points.length < 3) return null
  tb = normalised(snapped(tb.points, ta.points, tolerance), tb.tags)
  ta = normalised(snapped(ta.points, tb.points, tolerance), ta.tags)
  if (ta.points.length < 3 || tb.points.length < 3) return null
  const a = ta.points
  const b = tb.points

  // Every crossing, and every vertex of one that lies on an edge of the other, cuts both
  const cuts: Point[] = []
  let crossings = 0
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      const hit = segmentIntersection(a[i], a[(i + 1) % a.length], b[j], b[(j + 1) % b.length])
      if (hit) {
        cuts.push(hit.point)
        crossings++
      }
    }
  }
  cuts.push(...a, ...b)
  const piecesA = cutEdges(a, ta.tags, cuts, 'a', tolerance)
  const piecesB = cutEdges(b, tb.tags, cuts, 'b', tolerance)

  // Where does each piece lie compared with the other ring? Away, inside it, or along its outline (shared)
  const kept: Piece[] = []
  let shared = 0
  const classify = (piece: Piece, other: Ring) => {
    const mid = { x: (piece.from.x + piece.to.x) / 2, y: (piece.from.y + piece.to.y) / 2 }
    const onOutline = distanceToRing(mid, other) <= tolerance && distanceToRing(piece.from, other) <= tolerance && distanceToRing(piece.to, other) <= tolerance
    if (onOutline) return 'shared' as const
    return containsPoint(other, mid) ? ('inside' as const) : ('outside' as const)
  }
  const sameWay = (piece: Piece, other: Ring) => {
    // Both rings run counter-clockwise: along a shared edge they go the same way when the other ring's edge points the same way
    let best = Infinity
    let dot = 0
    const vx = piece.to.x - piece.from.x
    const vy = piece.to.y - piece.from.y
    for (let i = 0; i < other.length; i++) {
      const p = other[i]
      const q = other[(i + 1) % other.length]
      const d = closestOnSegment({ x: (piece.from.x + piece.to.x) / 2, y: (piece.from.y + piece.to.y) / 2 }, p, q).distance
      if (d < best) {
        best = d
        dot = vx * (q.x - p.x) + vy * (q.y - p.y)
      }
    }
    return dot > 0
  }
  for (const piece of piecesA) {
    const where = classify(piece, b)
    if (where === 'outside') kept.push(piece)
    else if (where === 'shared') {
      shared++
      // Same way: both areas are on the same side, so the other side is outside both and the edge is on the union's outline
      if (sameWay(piece, b)) kept.push(piece)
    }
  }
  for (const piece of piecesB) if (classify(piece, a) === 'outside') kept.push(piece)

  if (crossings === 0 && shared === 0) return null
  if (kept.length < 3) return null

  // Join the kept pieces end to start into one loop
  const startsAt = new Map<string, Piece[]>()
  for (const piece of kept) startsAt.set(key(piece.from), [...(startsAt.get(key(piece.from)) ?? []), piece])
  if ([...startsAt.values()].some((list) => list.length !== 1)) return null
  const ring: Ring = []
  const origin: ('a' | 'b')[] = []
  const tags: string[] = []
  let at = kept[0]
  for (let guard = 0; guard <= kept.length; guard++) {
    ring.push(at.from)
    origin.push(at.origin)
    tags.push(at.tag)
    const next = startsAt.get(key(at.to))?.[0]
    if (!next) return null
    if (next === kept[0]) break
    at = next
  }
  if (ring.length !== kept.length) return null

  // Self-check: the union is never smaller than either, never bigger than both together
  const area = signedArea(ring)
  const slack = tolerance * tolerance * 4 + 1
  if (area <= 0 || area < Math.max(areaOf(a), areaOf(b)) - slack || area > areaOf(a) + areaOf(b) + slack) return null
  return { ring, origin, tags }
}
