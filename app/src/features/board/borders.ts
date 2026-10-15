// Areas: what is under a point, where a name goes, per-edge colours, and merging a new border into the ones it touches.
// Pure (borders.test.ts).
import { boundsOf } from './bounds'
import type { Change } from './changes'
import { canSelect, drawOrder } from './layers'
import { flattenedOf } from './pathGeometry'
import { containsPoint, signedArea, unionPolygons, type Ring } from './polygon'
import type { Board, BorderObject, EdgeRun, Link, Point } from './types'

/** The topmost area (border) the point is inside */
export function areaAt(board: Board, p: Point): BorderObject | null {
  const order = drawOrder(board)
  for (let i = order.length - 1; i >= 0; i--) {
    const o = order[i]
    if (o.kind === 'border' && !o.open && canSelect(o) && containsPoint(flattenedOf(o), p)) return o
  }
  return null
}

const labelCache = new WeakMap<Ring, Point>()

/** Where an area's name goes: the centre of mass when that is inside it, else the middle of its widest stretch at that height */
export function labelPoint(ring: Ring): Point {
  const known = labelCache.get(ring)
  if (known) return known
  let cx = 0
  let cy = 0
  const area = signedArea(ring)
  if (Math.abs(area) < 1e-9) {
    cx = ring.reduce((s, p) => s + p.x, 0) / ring.length
    cy = ring.reduce((s, p) => s + p.y, 0) / ring.length
  } else {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      const f = a.x * b.y - b.x * a.y
      cx += (a.x + b.x) * f
      cy += (a.y + b.y) * f
    }
    cx /= 6 * area
    cy /= 6 * area
  }
  let out = { x: cx, y: cy }
  if (!containsPoint(ring, out)) {
    // Where the line at that height enters and leaves the area
    const xs: number[] = []
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i]
      const b = ring[(i + 1) % ring.length]
      if (a.y > cy !== b.y > cy) xs.push(a.x + ((cy - a.y) / (b.y - a.y)) * (b.x - a.x))
    }
    xs.sort((x, y) => x - y)
    let best = -1
    for (let i = 0; i + 1 < xs.length; i += 2) {
      if (xs[i + 1] - xs[i] > best) {
        best = xs[i + 1] - xs[i]
        out = { x: (xs[i] + xs[i + 1]) / 2, y: cy }
      }
    }
  }
  labelCache.set(ring, out)
  return out
}

/** The text in lines of at most `maxChars` characters (a longer word has a line of its own) */
export function wrapWords(text: string, maxChars: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && line.length + 1 + word.length > maxChars) {
        lines.push(line)
        line = word
      } else line = line ? `${line} ${word}` : word
    }
    lines.push(line)
  }
  return lines
}

/** The colour of each edge (edge i runs from point i to the next) */
export function edgeColours(border: BorderObject): string[] {
  const runs = [...(border.edges ?? [])].sort((a, b) => a.from - b.from)
  return border.points.map((_, i) => {
    let colour = border.style.color
    for (const run of runs) if (run.from <= i) colour = run.color
    return colour
  })
}

/** Colours per edge back as runs; nothing when every edge is `base` */
export function edgeRuns(colours: string[], base: string): EdgeRun[] {
  const runs: EdgeRun[] = []
  let last = base
  colours.forEach((color, from) => {
    if (color !== last) {
      runs.push({ from, color })
      last = color
    }
  })
  return runs
}

/** The runs of an area's outline that have one colour each: points `from`…`to` (the last run closes on the first point) */
export function colourRuns(points: Point[], colours: string[]): { line: Point[]; color: string }[] {
  const runs: { line: Point[]; color: string }[] = []
  let start = 0
  for (let i = 1; i <= colours.length; i++) {
    if (i === colours.length || colours[i] !== colours[start]) {
      runs.push({ line: [...points.slice(start, i), points[i % points.length]], color: colours[start] })
      start = i
    }
  }
  return runs
}

/** The ring rounded to whole numbers (the file's format), repeated points dropped; `tags[i]` stays with the edge it was on */
function roundedRing(ring: Ring, tags: string[]): { points: Point[]; tags: string[] } {
  const points: Point[] = []
  const kept: string[] = []
  ring.forEach((p, i) => {
    const q = { x: Math.round(p.x), y: Math.round(p.y) }
    const last = points[points.length - 1]
    if (last && last.x === q.x && last.y === q.y) {
      kept[kept.length - 1] = tags[i]
      return
    }
    points.push(q)
    kept.push(tags[i])
  })
  const first = points[0]
  const end = points[points.length - 1]
  if (points.length > 1 && first.x === end.x && first.y === end.y) {
    points.pop()
    kept.pop()
  }
  return { points, tags: kept }
}

const sameLink = (a: Link, b: Link) => a.to === b.to && a.id === b.id

/**
 * What finishing `drawn` does to the board: when it overlaps or touches existing areas (within `tolerance`), they all
 * become one border, in one change: the one with the lowest id stays (its name, description, fill, style, links) and takes
 * the others' links; the rest go. Each edge keeps the colour of the border it came from. Nothing to merge (or a union that
 * cannot be made reliably): the drawn border is simply added. `id` is the surviving border, or null when added.
 */
export function mergeBorders(board: Board, drawn: Omit<BorderObject, 'id'>, tolerance: number): { change: Change; id: number | null } {
  // An open border is a line: nothing to merge it with
  if (drawn.open) return { change: { add: [drawn] }, id: null }
  const reach = { x: Math.min(...drawn.points.map((p) => p.x)) - tolerance, y: Math.min(...drawn.points.map((p) => p.y)) - tolerance, w: 0, h: 0 }
  reach.w = Math.max(...drawn.points.map((p) => p.x)) + tolerance - reach.x
  reach.h = Math.max(...drawn.points.map((p) => p.y)) + tolerance - reach.y
  const candidates = board.objects
    .filter((o): o is BorderObject => o.kind === 'border' && !o.open && canSelect(o))
    .filter((o) => {
      const b = boundsOf(o)
      return b.x <= reach.x + reach.w && reach.x <= b.x + b.w && b.y <= reach.y + reach.h && reach.y <= b.y + b.h
    })
    .sort((a, b) => a.id - b.id)

  let ring: Ring = drawn.points
  let tags: string[] = drawn.points.map(() => drawn.style.color)
  const merged: BorderObject[] = []
  for (const c of candidates) {
    const flat = c.handles ? flattenedOf(c) : c.points
    const colours = c.handles ? flat.map(() => c.style.color) : edgeColours(c)
    const union = unionPolygons(flat, ring, tolerance, colours, tags)
    if (!union) continue
    ring = union.ring
    tags = union.tags
    merged.push(c)
  }
  if (merged.length === 0) return { change: { add: [drawn] }, id: null }

  const survivor = merged[0]
  const rounded = roundedRing(ring, tags)
  if (rounded.points.length < 3) return { change: { add: [drawn] }, id: null }
  const links = [...survivor.links]
  for (const other of merged.slice(1)) for (const link of other.links) if (!links.some((l) => sameLink(l, link))) links.push(link)
  const edges = edgeRuns(rounded.tags, survivor.style.color)
  return {
    change: {
      update: [{ id: survivor.id, patch: { points: rounded.points, handles: undefined, edges: edges.length ? edges : undefined, links } }],
      remove: merged.slice(1).map((o) => o.id),
    },
    id: survivor.id,
  }
}
