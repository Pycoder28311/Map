import { Reader, Writer } from '../projects/strokeCodec'
import { DRAWING_WAYS, LINE_TYPES, type Style } from './types'

export const DEFAULT_STYLE: Style = {
  color: '#1f2937',
  opacity: 100,
  thickness: 3,
  fixedWidth: false,
  type: 'solid',
  gap: 0,
  part: 0,
  arrow: { start: false, end: false, style: 0, size: 0 },
  way: 'exact',
  amount: 0,
}

/** What the pencil draws with */
export const PENCIL_STYLE: Style = DEFAULT_STYLE

const FIXED_WIDTH = 1
const ARROW_START = 2
const ARROW_END = 4
const HAS_STROKE = 8
const HAS_SHADOW = 16
const HAS_SOFTNESS = 32

/** '#rrggbb' as three bytes */
export function writeColor(w: Writer, color: string) {
  const n = parseInt(color.slice(1), 16)
  w.byte(n >> 16)
  w.byte(n >> 8)
  w.byte(n)
}

export function readColor(r: Reader) {
  const n = (r.byte() << 16) | (r.byte() << 8) | r.byte()
  return `#${n.toString(16).padStart(6, '0')}`
}

const indexOf = <T extends string>(list: readonly T[], value: T) => Math.max(0, list.indexOf(value))

/** Only what applies is written (no gap for a solid line, no arrow look without an arrow, no amount for straight) */
export function writeStyle(w: Writer, s: Style) {
  w.byte((s.fixedWidth ? FIXED_WIDTH : 0) | (s.arrow.start ? ARROW_START : 0) | (s.arrow.end ? ARROW_END : 0) | (s.stroke ? HAS_STROKE : 0) | (s.shadow ? HAS_SHADOW : 0) | (s.softness ? HAS_SOFTNESS : 0))
  writeColor(w, s.color)
  w.byte(s.opacity)
  w.int(s.thickness)
  w.byte(indexOf(LINE_TYPES, s.type))
  if (s.type === 'dashed' || s.type === 'diagonal') {
    w.int(s.gap)
    w.int(s.part)
  } else if (s.type === 'double') w.int(s.gap)
  if (s.arrow.start || s.arrow.end) {
    w.byte(s.arrow.style)
    w.int(s.arrow.size)
  }
  w.byte(indexOf(DRAWING_WAYS, s.way))
  if (s.way === 'exact' || s.way === 'corners') w.byte(s.amount)
  if (s.stroke) {
    writeColor(w, s.stroke.color)
    w.int(s.stroke.width)
    w.byte(s.stroke.opacity)
  }
  if (s.shadow) {
    writeColor(w, s.shadow.color)
    w.int(s.shadow.blur)
    w.int(s.shadow.distance)
  }
  if (s.softness) w.byte(s.softness)
}

export function readStyle(r: Reader): Style {
  const flags = r.byte()
  const color = readColor(r)
  const opacity = r.byte()
  const thickness = r.int()
  const type = LINE_TYPES[r.byte()]
  const hasGap = type === 'dashed' || type === 'diagonal' || type === 'double'
  if (!type) throw new RangeError('Unknown line type')
  const gap = hasGap ? r.int() : 0
  const part = type === 'dashed' || type === 'diagonal' ? r.int() : 0
  const start = (flags & ARROW_START) !== 0
  const end = (flags & ARROW_END) !== 0
  const arrow = start || end ? { start, end, style: r.byte(), size: r.int() } : { start, end, style: 0, size: 0 }
  const way = DRAWING_WAYS[r.byte()]
  if (!way) throw new RangeError('Unknown drawing way')
  const amount = way === 'exact' || way === 'corners' ? r.byte() : 0
  const stroke = (flags & HAS_STROKE) !== 0 ? { color: readColor(r), width: r.int(), opacity: r.byte() } : undefined
  const shadow = (flags & HAS_SHADOW) !== 0 ? { color: readColor(r), blur: r.int(), distance: r.int() } : undefined
  const softness = (flags & HAS_SOFTNESS) !== 0 ? r.byte() : undefined
  return { color, opacity, thickness, fixedWidth: (flags & FIXED_WIDTH) !== 0, type, gap, part, arrow, way, amount, ...(stroke ? { stroke } : {}), ...(shadow ? { shadow } : {}), ...(softness ? { softness } : {}) }
}

/** How round the corners of a path are: its own softness, or for the exact way of older maps the `amount` that was the softness then */
export const softnessOf = (s: Style) => s.softness ?? (s.way === 'exact' ? s.amount : 0)
