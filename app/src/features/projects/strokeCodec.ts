// How a drawing is stored (it goes to Cloudflare file storage, so it must be small). Pure (strokeCodec.test.ts).
//   1. simplify: drop the points that don't change a stroke's shape (Ramer–Douglas–Peucker). The board then
//      draws a smooth curve through the points that are left (MapPanel's drawStroke), so a bend needs few of them
//   2. whole numbers only
//   3. per stroke: the first point, then only each point's difference from the one before, as two lists (x, then y)
//   4. binary: every number is a zigzag varint: 1 byte from -64 to 63, 2 bytes up to ±8191 (the whole board)
//   5. compress the whole file with brotli (compress.ts)
//
// The file: [stroke count] then per stroke [difference count] [first x] [first y] [x differences] [y differences]
// Zigzag: 0, -1, 1, -2, 2… become 0, 1, 2, 3, 4…, so small numbers of both signs stay small; a varint takes
// 7 bits per byte and one more byte while the top bit is set.

export type Point = { x: number; y: number }

/** How far (in board units) a dropped point may be from the simplified line */
const TOLERANCE = 2.5

/** How far `p` is from the line through `a` and `b` */
function distance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length
}

/** The stroke with whole-number points and only the ones that matter (the ends are always kept) */
export function simplify(stroke: Point[], tolerance = TOLERANCE): Point[] {
  const points = stroke.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  if (points.length < 3) return points
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = keep[points.length - 1] = true
  // Iterative, so a very long stroke can't overflow the call stack
  const ranges: [number, number][] = [[0, points.length - 1]]
  while (ranges.length) {
    const [from, to] = ranges.pop()!
    let far = -1
    let farDistance = tolerance
    for (let i = from + 1; i < to; i++) {
      const d = distance(points[i], points[from], points[to])
      if (d > farDistance) {
        far = i
        farDistance = d
      }
    }
    if (far >= 0) {
      keep[far] = true
      ranges.push([from, far], [far, to])
    }
  }
  return points.filter((_, i) => keep[i])
}

/**
 * The stroke thinned the way a pen moving along it would: a point stays only where the path has left a strip of `tolerance`
 * on each side of the line from the last point kept through the first point after it (Reumann–Witkowski). Unlike `simplify`,
 * what is kept never changes as the stroke grows: the thinning of a stroke is the start of the thinning of any longer one,
 * apart from its last point, which is always there. So a line drawn live is already the line that is saved.
 */
export function thin(stroke: Point[], tolerance = TOLERANCE): Point[] {
  const points = stroke.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
  if (points.length < 3) return points
  const out = [points[0]]
  // The strip's line runs from the last point kept through `through`
  let through = 1
  for (let i = 2; i < points.length; i++) {
    if (distance(points[i], out[out.length - 1], points[through]) > tolerance) {
      out.push(points[i - 1])
      through = i
    }
  }
  const last = points[points.length - 1]
  const kept = out[out.length - 1]
  if (kept.x !== last.x || kept.y !== last.y) out.push(last)
  return out
}

/* ─────────────── Binary ─────────────── */

export class Writer {
  bytes: number[] = []
  /** A whole number of any sign: zigzag, then 7 bits per byte */
  int(n: number) {
    let u = n >= 0 ? n * 2 : -n * 2 - 1
    while (u >= 128) {
      this.bytes.push((u % 128) | 128)
      u = Math.floor(u / 128)
    }
    this.bytes.push(u)
  }
  /** One raw byte, 0–255 */
  byte(n: number) {
    this.bytes.push(n & 255)
  }
  /** Text: its byte length, then UTF-8 */
  str(s: string) {
    const utf8 = new TextEncoder().encode(s)
    this.int(utf8.length)
    for (const b of utf8) this.bytes.push(b)
  }
  /** Bytes already made (a record's body) */
  raw(bytes: ArrayLike<number>) {
    for (let i = 0; i < bytes.length; i++) this.bytes.push(bytes[i])
  }
}

export class Reader {
  at = 0
  bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  /** Bytes not read yet */
  get left() {
    return this.bytes.length - this.at
  }
  int() {
    let u = 0
    for (let scale = 1; ; scale *= 128) {
      if (this.at >= this.bytes.length) throw new RangeError('Unexpected end of data')
      const b = this.bytes[this.at++]
      u += (b & 127) * scale
      if (b < 128) break
    }
    return u % 2 === 0 ? u / 2 : -(u + 1) / 2
  }
  byte() {
    if (this.at >= this.bytes.length) throw new RangeError('Unexpected end of data')
    return this.bytes[this.at++]
  }
  /** A number of things still to come, each at least `each` bytes: more than fit in what is left is an error */
  count(each = 1) {
    const n = this.int()
    if (n < 0 || n * each > this.left) throw new RangeError('Count larger than the data')
    return n
  }
  str() {
    const length = this.count()
    const s = new TextDecoder().decode(this.bytes.subarray(this.at, this.at + length))
    this.at += length
    return s
  }
  /** The next `length` bytes as a reader of their own (the parent moves past them) */
  slice(length: number) {
    if (length < 0 || length > this.left) throw new RangeError('Count larger than the data')
    const part = new Reader(this.bytes.subarray(this.at, this.at + length))
    this.at += length
    return part
  }
}

/** One path (at least one point): the difference count, the first point, then the x and the y differences */
export function writePath(w: Writer, points: Point[]) {
  w.int(points.length - 1)
  w.int(points[0].x)
  w.int(points[0].y)
  for (let i = 1; i < points.length; i++) w.int(points[i].x - points[i - 1].x)
  for (let i = 1; i < points.length; i++) w.int(points[i].y - points[i - 1].y)
}

/** A path back from writePath's bytes */
export function readPath(r: Reader): Point[] {
  const deltas = r.count(2)
  const path: Point[] = [{ x: r.int(), y: r.int() }]
  for (let i = 0; i < deltas; i++) path.push({ x: path[i].x + r.int(), y: 0 })
  for (let i = 0; i < deltas; i++) path[i + 1].y = path[i].y + r.int()
  return path
}

/** All strokes (whole-number points, see simplify) as the file's bytes, before compressing */
export function encode(strokes: Point[][]): Uint8Array {
  const w = new Writer()
  w.int(strokes.length)
  for (const stroke of strokes) {
    if (stroke.length === 0) continue
    writePath(w, stroke)
  }
  return Uint8Array.from(w.bytes)
}

/** The strokes back from encode's bytes */
export function decode(bytes: Uint8Array): Point[][] {
  const r = new Reader(bytes)
  const strokes: Point[][] = []
  for (let count = r.count(3); count > 0; count--) strokes.push(readPath(r))
  return strokes
}
