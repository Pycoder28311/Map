// How a board is saved (before brotli, see features/projects/compress.ts). Numbers are the strokeCodec's zigzag varints.
//   file    := version(1) nextId count record*
//   record  := kind length body                (a reader skips a kind it doesn't know, and the reserved image)
//   body    := id layer name(text) linkCount link*  <the kind's part>
//   link    := 0 id(text) | 1 id(number)
//   line   := style path                       path := flags(bit 0: handles) then the strokeCodec's path, then 4 numbers per point
//   border := style path [extras]              extras (only when there are any) := flags(bit 0 fill, 1 description, 2 edge runs, 3 open: the ends are not joined)
//                                              [fill] [description(text)] [runCount (from colour)*]
//   shape   := style shapeType x y w h rotation param fillFlag [r g b opacity]
//   text    := x y text [extras]       text is '' when runs follow (they carry the words)
//                                      extras (only when any differs from the defaults) := flags(bit 0 width, 1 rotation, 2 size colour opacity,
//                                        3 align, 4 runs, 5 attach, 6 isName) then width | rotation | size colour opacity | align | runs | attach
//                                      runs := count (text flags(bold italic underline strike hasColour hasSize) [colour] [size])*
//   point   := x y [extras]    extras (only when any differs from the defaults) := flags(bit 0 label, 1 icon, 2 colour, 3 banner, 4 description)
//                              [label byte] [icon byte] [colour] [banner id(text)] [description(text)]
// A plain pencil line is the old path plus about 15 bytes.
import { readPath, Reader, writePath, Writer } from '../projects/strokeCodec'
import { hasShadow, shadowOffset } from './textShadow'
import { readColor, readStyle, writeColor, writeStyle } from './style'
import { POINT_DEFAULT } from './pointLabels'
import { WEIGHT_NORMAL } from './fonts'
import { TEXT_DEFAULT } from './textDefaults'
import {
  KIND_NUMBER,
  PIN_ICONS,
  POINT_LABELS,
  type PointObject,
  SHAPE_TYPES,
  type Board,
  type EdgeRun,
  type Fill,
  type BoardObject,
  type Handle,
  type Link,
  type Point,
  type TextAlign,
  BOX_SHAPES,
  type TextObject,
  type TextRun,
  type ObjectKind,
} from './types'

const VERSION = 1
const HANDLES = 1
const HAS_FILL = 1
const HAS_DESCRIPTION = 2
const HAS_EDGES = 4
const IS_OPEN = 8
const HAS_FILL_LOOK = 16

export class UnsupportedBoardVersion extends Error {
  constructor(version: number) {
    super(`Unsupported board file version ${version}`)
  }
}

function writeLinks(w: Writer, links: Link[]) {
  w.int(links.length)
  for (const link of links) {
    if (link.to === 'sidebar') {
      w.byte(0)
      w.str(link.id)
    } else {
      w.byte(1)
      w.int(link.id)
    }
  }
}

function readLinks(r: Reader): Link[] {
  const links: Link[] = []
  for (let n = r.count(2); n > 0; n--) {
    const to = r.byte()
    if (to === 0) links.push({ to: 'sidebar', id: r.str() })
    else if (to === 1) links.push({ to: 'board', id: r.int() })
    else throw new RangeError('Unknown link kind')
  }
  return links
}

function writePathWithHandles(w: Writer, points: Point[], handles?: Handle[]) {
  const has = handles !== undefined && handles.length === points.length
  w.byte(has ? HANDLES : 0)
  writePath(w, points)
  if (has) for (const h of handles) [h.inX, h.inY, h.outX, h.outY].forEach((n) => w.int(n))
}

function readPathWithHandles(r: Reader) {
  const flags = r.byte()
  const points = readPath(r)
  if (!(flags & HANDLES)) return { points }
  const handles = points.map(() => ({ inX: r.int(), inY: r.int(), outX: r.int(), outY: r.int() }))
  return { points, handles }
}

function writeFill(w: Writer, fill: { color: string; opacity: number } | null) {
  w.byte(fill ? 1 : 0)
  if (fill) {
    writeColor(w, fill.color)
    w.byte(fill.opacity)
  }
}

function readFillValue(r: Reader): Fill {
  return { color: readColor(r), opacity: r.byte() }
}

const ALIGNS: TextAlign[] = ['left', 'center', 'right', 'justify']
const RUN_FLAGS = { bold: 1, italic: 2, underline: 4, strike: 8, color: 16, size: 32 } as const

function writePoint(w: Writer, o: PointObject) {
  w.int(o.anchor.x)
  w.int(o.anchor.y)
  const flags =
    (o.label !== POINT_DEFAULT.label ? 1 : 0) | (o.icon !== POINT_DEFAULT.icon ? 2 : 0) | (o.color !== POINT_DEFAULT.color ? 4 : 0) | (o.banner ? 8 : 0) | (o.description ? 16 : 0)
  if (flags === 0) return
  w.byte(flags)
  if (flags & 1) w.byte(Math.max(0, POINT_LABELS.indexOf(o.label)))
  if (flags & 2) w.byte(Math.max(0, PIN_ICONS.indexOf(o.icon)))
  if (flags & 4) writeColor(w, o.color)
  if (flags & 8) w.str(o.banner!)
  if (flags & 16) w.str(o.description!)
}

function readPoint(r: Reader): Omit<PointObject, 'id' | 'layer' | 'name' | 'links' | 'kind'> {
  const anchor = { x: r.int(), y: r.int() }
  const flags = r.left > 0 ? r.byte() : 0
  const label = flags & 1 ? POINT_LABELS[r.byte()] : POINT_DEFAULT.label
  const icon = flags & 2 ? PIN_ICONS[r.byte()] : POINT_DEFAULT.icon
  if (!label || !icon) throw new RangeError('Unknown point label or icon')
  const color = flags & 4 ? readColor(r) : POINT_DEFAULT.color
  const banner = flags & 8 ? r.str() : undefined
  const description = flags & 16 ? r.str() : undefined
  return { anchor, label, icon, color, ...(banner ? { banner } : {}), ...(description ? { description } : {}) }
}

function writeText(w: Writer, o: TextObject) {
  w.int(o.anchor.x)
  w.int(o.anchor.y)
  const runs = o.runs && o.runs.length > 0 ? o.runs : null
  // The runs carry the words; the plain text is made again when it is read
  w.str(runs ? '' : o.text)
  const style = o.size !== TEXT_DEFAULT.size || o.color !== TEXT_DEFAULT.color || o.opacity !== TEXT_DEFAULT.opacity
  // What came later than the first bits: a second byte (bit 128 of the first says it is there)
  const extras =
    (o.fixedSize ? 1 : 0) | (o.font ? 2 : 0) | (o.weight !== undefined && o.weight !== WEIGHT_NORMAL ? 4 : 0) | (o.italic ? 8 : 0) | (o.underline ? 16 : 0) | (o.strike ? 32 : 0) | (o.oblique ? 64 : 0) | (o.underlineColor ? 128 : 0) | (o.strikeColor ? 256 : 0) |
    ((o.strokeWidth ?? 0) > 0 ? 512 : 0) | (hasShadow(o) ? 1024 | 131072 : 0) | (o.curve ? 2048 : 0) | (o.spacing ? 4096 : 0) | (o.boxed ? 8192 : 0) | (o.boxed && o.boxColor ? 16384 : 0) | (o.boxed && o.boxShape && o.boxShape !== 'square' ? 32768 : 0) | (o.lineGap ? 65536 : 0)
  const flags =
    (o.width !== TEXT_DEFAULT.width ? 1 : 0) |
    (o.rotation !== TEXT_DEFAULT.rotation ? 2 : 0) |
    (style ? 4 : 0) |
    (o.align !== TEXT_DEFAULT.align ? 8 : 0) |
    (runs ? 16 : 0) |
    (o.attach !== undefined ? 32 : 0) |
    (o.isName ? 64 : 0) |
    (extras ? 128 : 0)
  if (flags === 0) return
  w.byte(flags)
  if (flags & 1) w.int(o.width)
  if (flags & 2) w.int(o.rotation)
  if (flags & 4) {
    w.int(o.size)
    writeColor(w, o.color)
    w.byte(o.opacity)
  }
  if (flags & 8) w.byte(Math.max(0, ALIGNS.indexOf(o.align)))
  if (runs) {
    w.int(runs.length)
    for (const run of runs) {
      w.str(run.text)
      w.byte(
        (run.bold ? RUN_FLAGS.bold : 0) | (run.italic ? RUN_FLAGS.italic : 0) | (run.underline ? RUN_FLAGS.underline : 0) | (run.strike ? RUN_FLAGS.strike : 0) |
          (run.color ? RUN_FLAGS.color : 0) | (run.size !== undefined ? RUN_FLAGS.size : 0),
      )
      if (run.color) writeColor(w, run.color)
      if (run.size !== undefined) w.int(run.size)
    }
  }
  if (flags & 32) w.int(o.attach!)
  if (flags & 128) {
    w.int(extras)
    if (extras & 2) w.byte(o.font!)
    if (extras & 4) w.int(o.weight!)
    if (extras & 128) writeColor(w, o.underlineColor!)
    if (extras & 256) writeColor(w, o.strikeColor!)
    if (extras & 512) {
      writeColor(w, o.strokeColor ?? '#000000')
      w.int(o.strokeWidth!)
      w.byte(o.strokeOpacity ?? 100)
    }
    if (extras & 1024) {
      writeColor(w, o.shadowColor ?? '#000000')
      w.int(o.shadowBlur ?? 0)
      w.int(o.shadowDistance ?? 0)
      // A separate Y offset (a file from before has one distance, down and right alike)
      w.int(shadowOffset(o).y)
    }
    if (extras & 2048) w.int(o.curve!)
    if (extras & 4096) w.int(o.spacing!)
    if (extras & 16384) writeColor(w, o.boxColor!)
    if (extras & 32768) w.byte(BOX_SHAPES.indexOf(o.boxShape!))
    if (extras & 65536) w.int(o.lineGap!)
  }
}

/** The shadow; `hasY`: its own Y offset follows (a file from before has one distance, down and right alike) */
function readShadow(r: Reader, hasY: boolean) {
  const shadowColor = readColor(r)
  const shadowBlur = r.int()
  const shadowDistance = r.int()
  return { shadowColor, shadowBlur, shadowDistance, shadowY: hasY ? r.int() : shadowDistance }
}

function readStroke(r: Reader) {
  const strokeColor = readColor(r)
  const strokeWidth = r.int()
  const strokeOpacity = r.byte()
  return { strokeColor, strokeWidth, ...(strokeOpacity !== 100 ? { strokeOpacity } : {}) }
}

function readText(r: Reader): Omit<TextObject, 'id' | 'layer' | 'name' | 'links' | 'kind'> {
  const anchor = { x: r.int(), y: r.int() }
  let text = r.str()
  const flags = r.left > 0 ? r.byte() : 0
  const width = flags & 1 ? r.int() : TEXT_DEFAULT.width
  const rotation = flags & 2 ? r.int() : TEXT_DEFAULT.rotation
  let size: number = TEXT_DEFAULT.size
  let color: string = TEXT_DEFAULT.color
  let opacity: number = TEXT_DEFAULT.opacity
  if (flags & 4) {
    size = r.int()
    color = readColor(r)
    opacity = r.byte()
  }
  const align = flags & 8 ? ALIGNS[r.byte()] : TEXT_DEFAULT.align
  if (!align) throw new RangeError('Unknown text alignment')
  let runs: TextRun[] | undefined
  if (flags & 16) {
    runs = []
    for (let n = r.count(2); n > 0; n--) {
      const word = r.str()
      const f = r.byte()
      const run: TextRun = { text: word }
      if (f & RUN_FLAGS.bold) run.bold = true
      if (f & RUN_FLAGS.italic) run.italic = true
      if (f & RUN_FLAGS.underline) run.underline = true
      if (f & RUN_FLAGS.strike) run.strike = true
      if (f & RUN_FLAGS.color) run.color = readColor(r)
      if (f & RUN_FLAGS.size) run.size = r.int()
      runs.push(run)
    }
    text = runs.map((x) => x.text).join('')
  }
  const attach = flags & 32 ? r.int() : undefined
  const extras = flags & 128 ? r.int() : 0
  const font = extras & 2 ? r.byte() : undefined
  const weight = extras & 4 ? r.int() : undefined
  const underlineColor = extras & 128 ? readColor(r) : undefined
  const strikeColor = extras & 256 ? readColor(r) : undefined
  const stroke = extras & 512 ? readStroke(r) : undefined
  const shadow = extras & 1024 ? readShadow(r, (extras & 131072) !== 0) : undefined
  const curve = extras & 2048 ? r.int() : undefined
  const spacing = extras & 4096 ? r.int() : undefined
  const boxColor = extras & 16384 ? readColor(r) : undefined
  const boxShape = extras & 32768 ? BOX_SHAPES[r.byte()] : undefined
  const lineGap = extras & 65536 ? r.int() : undefined
  if (extras & 32768 && !boxShape) throw new RangeError('Unknown text frame')
  return { anchor, text, ...(runs ? { runs } : {}), width, rotation, align, size, color, opacity, ...(attach !== undefined ? { attach } : {}), ...(flags & 64 ? { isName: true } : {}), ...(extras & 1 ? { fixedSize: true } : {}),
    ...(font ? { font } : {}),
    ...(weight !== undefined ? { weight } : {}),
    ...(extras & 8 ? { italic: true } : {}),
    ...(extras & 16 ? { underline: true } : {}),
    ...(extras & 32 ? { strike: true } : {}),
    ...(extras & 64 ? { oblique: true } : {}),
    ...(underlineColor ? { underlineColor } : {}),
    ...(strikeColor ? { strikeColor } : {}),
    ...stroke,
    ...shadow,
    ...(curve ? { curve } : {}),
    ...(spacing ? { spacing } : {}),
    ...(extras & 8192 ? { boxed: true } : {}),
    ...(boxColor ? { boxColor } : {}),
    ...(boxShape ? { boxShape } : {}),
    ...(lineGap ? { lineGap } : {}),
  }
}

function writeRecord(o: BoardObject): Writer {
  const w = new Writer()
  w.int(o.id)
  w.int(o.layer)
  w.str(o.name)
  writeLinks(w, o.links)
  switch (o.kind) {
    case 'line':
      writeStyle(w, o.style)
      writePathWithHandles(w, o.points, o.handles)
      break
    case 'border': {
      writeStyle(w, o.style)
      writePathWithHandles(w, o.points, o.handles)
      const edges = o.edges ?? []
      const look = !!(o.fill?.texture || o.fill?.image)
      const flags = (o.fill ? HAS_FILL : 0) | (o.description ? HAS_DESCRIPTION : 0) | (edges.length ? HAS_EDGES : 0) | (o.open ? IS_OPEN : 0) | (look ? HAS_FILL_LOOK : 0)
      // Nothing extra: the bytes are what they were before areas existed
      if (flags === 0) break
      w.byte(flags)
      if (o.fill) {
        writeColor(w, o.fill.color)
        w.byte(o.fill.opacity)
      }
      if (o.description) w.str(o.description)
      if (edges.length) {
        w.int(edges.length)
        for (const run of edges) {
          w.int(run.from)
          writeColor(w, run.color)
        }
      }
      if (look) {
        w.byte(o.fill!.texture ?? 0)
        w.str(o.fill!.image ?? '')
      }
      break
    }
    case 'shape':
      writeStyle(w, o.style)
      w.byte(Math.max(0, SHAPE_TYPES.indexOf(o.shape)))
      for (const n of [o.box.x, o.box.y, o.box.w, o.box.h, o.rotation, o.param]) w.int(n)
      writeFill(w, o.fill)
      break
    case 'text':
      writeText(w, o)
      break
    case 'point':
      writePoint(w, o)
      break
  }
  return w
}

/** The board as the file's bytes, before compressing */
export function encodeBoard(board: Board): Uint8Array {
  const w = new Writer()
  w.byte(VERSION)
  w.int(board.nextId)
  w.int(board.objects.length)
  for (const object of board.objects) {
    const body = writeRecord(object)
    w.byte(KIND_NUMBER[object.kind])
    w.int(body.bytes.length)
    w.raw(body.bytes)
  }
  return Uint8Array.from(w.bytes)
}

const KINDS = Object.fromEntries(Object.entries(KIND_NUMBER).map(([kind, n]) => [n, kind])) as Record<number, ObjectKind>

function readRecord(kind: ObjectKind, r: Reader): BoardObject {
  const base = { id: r.int(), layer: r.int(), name: r.str(), links: readLinks(r) }
  switch (kind) {
    case 'line':
      return { ...base, kind, style: readStyle(r), ...readPathWithHandles(r) }
    case 'border': {
      const style = readStyle(r)
      const path = readPathWithHandles(r)
      // Files from before areas end here
      const flags = r.left > 0 ? r.byte() : 0
      const fill = flags & HAS_FILL ? readFillValue(r) : null
      const description = flags & HAS_DESCRIPTION ? r.str() : ''
      const edges: EdgeRun[] = []
      if (flags & HAS_EDGES) for (let n = r.count(4); n > 0; n--) edges.push({ from: r.int(), color: readColor(r) })
      if (flags & HAS_FILL_LOOK) {
        const texture = r.byte()
        const image = r.str()
        if (fill) Object.assign(fill, texture ? { texture } : {}, image ? { image } : {})
      }
      return { ...base, kind, style, ...path, fill, description, ...(edges.length ? { edges } : {}), ...(flags & IS_OPEN ? { open: true } : {}) }
    }
    case 'shape': {
      const style = readStyle(r)
      const shape = SHAPE_TYPES[r.byte()]
      if (!shape) throw new RangeError('Unknown shape')
      const box = { x: r.int(), y: r.int(), w: r.int(), h: r.int() }
      const rotation = r.int()
      const param = r.int()
      const fill = r.byte() ? { color: readColor(r), opacity: r.byte() } : null
      return { ...base, kind, style, shape, box, rotation, param, fill }
    }
    case 'text':
      return { ...base, kind, ...readText(r) }
    case 'point':
      return { ...base, kind, ...readPoint(r) }
  }
}

/** The board back from encodeBoard's bytes. Records of a kind it doesn't know are left out */
export function decodeBoard(bytes: Uint8Array): Board {
  const r = new Reader(bytes)
  const version = r.byte()
  if (version !== VERSION) throw new UnsupportedBoardVersion(version)
  const nextId = r.int()
  const objects: BoardObject[] = []
  for (let count = r.count(3); count > 0; count--) {
    const kind = KINDS[r.byte()]
    const body = r.slice(r.count())
    if (!kind) continue
    objects.push(readRecord(kind, body))
    if (body.left !== 0) throw new RangeError('Record size mismatch')
  }
  return { nextId, objects }
}
