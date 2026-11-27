// Every item turned into the units it covers, each with its colour; then the whole drawing flattened into one grid. Pure, and only
// whole units: an item's units are integers inside the board (what falls outside is cut). Each item's units are kept (cached) until the
// item changes: items are never changed in place, a change is a new object.
import { GLYPH_H, GLYPH_W, glyph } from './font5x7'
import type { Drawing, EllipseItem, Hex, Item, LineItem, RectItem, ShapeItem, TextItem } from './types'

/** Units (as board indexes) → colour */
export type Cells = Map<number, Hex>

export type Box = { x: number; y: number; w: number; h: number }

/** A mask of w × h, row by row (true: covered) */
type Mask = Uint8Array

/** The cells of a w × h mask that are within `t` units (8 neighbours, so corners count) of its outside */
function ring(inside: Mask, w: number, h: number, t: number): Mask {
  let inner = inside.slice()
  for (let k = 0; k < t; k++) {
    const next = new Uint8Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!inner[y * w + x]) continue
        let keep = 1
        for (let dy = -1; dy <= 1 && keep; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx < 0 || ny < 0 || nx >= w || ny >= h || !inner[ny * w + nx]) {
              keep = 0
              break
            }
          }
        next[y * w + x] = keep
      }
    inner = next
  }
  const band = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) band[i] = inside[i] && !inner[i] ? 1 : 0
  return band
}

/** A shape's mask in its own box painted onto the board: border where `band`, fill elsewhere inside */
function paintMask(cells: Cells, box: Box, inside: Mask, band: Mask, border: Hex | null, fill: Hex | null, width: number, height: number) {
  for (let y = 0; y < box.h; y++)
    for (let x = 0; x < box.w; x++) {
      const i = y * box.w + x
      if (!inside[i]) continue
      const color = band[i] ? border : fill
      const bx = box.x + x
      const by = box.y + y
      if (color && bx >= 0 && by >= 0 && bx < width && by < height) cells.set(by * width + bx, color)
    }
}

/** Whether (x, y) of a w × h box is cut off by a staircase corner `steps` deep (one step per unit, 45°) */
const cutCorner = (x: number, y: number, w: number, h: number, steps: number) => {
  if (steps <= 0) return false
  const dx = Math.min(x, w - 1 - x)
  const dy = Math.min(y, h - 1 - y)
  return dx < steps && dy < steps && dx + dy < steps
}

export function rasterRect(item: RectItem, width: number, height: number): Cells {
  const { x, y, w, h, steps } = item
  const t = item.border.thickness
  const cells: Cells = new Map()
  const inside = new Uint8Array(w * h)
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) inside[j * w + i] = cutCorner(i, j, w, h, steps) ? 0 : 1
  let band: Mask
  if (steps === 0) {
    // A plain rectangle: the band is exactly `t` units on every side
    band = new Uint8Array(w * h)
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) band[j * w + i] = i < t || j < t || i >= w - t || j >= h - t ? 1 : 0
  } else band = ring(inside, w, h, t)
  paintMask(cells, { x, y, w, h }, inside, band, t > 0 ? item.border.color : null, item.fill, width, height)
  return cells
}

/** The units inside an ellipse filling a w × h box (symmetric left / right and top / bottom; a square box gives a circle) */
export function ellipseMask(w: number, h: number): Mask {
  const mask = new Uint8Array(w * h)
  const rx = w / 2
  const ry = h / 2
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const nx = (i + 0.5 - rx) / rx
      const ny = (j + 0.5 - ry) / ry
      mask[j * w + i] = nx * nx + ny * ny <= 1.0001 ? 1 : 0
    }
  return mask
}

export function rasterEllipse(item: EllipseItem, width: number, height: number): Cells {
  const { x, y, w, h } = item
  const cells: Cells = new Map()
  const inside = ellipseMask(w, h)
  const t = item.border.thickness
  paintMask(cells, { x, y, w, h }, inside, ring(inside, w, h, t), t > 0 ? item.border.color : null, item.fill, width, height)
  return cells
}

/** The units of a straight line from one end to the other (Bresenham): no gaps, one unit per step */
export function linePoints(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const points: [number, number][] = []
  let x = x1
  let y = y1
  const dx = Math.abs(x2 - x1)
  const dy = -Math.abs(y2 - y1)
  const sx = x1 < x2 ? 1 : -1
  const sy = y1 < y2 ? 1 : -1
  let err = dx + dy
  for (;;) {
    points.push([x, y])
    if (x === x2 && y === y2) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return points
}

/** The offsets of a square stamp `size` units wide round its point (an even size leans up and left) */
export const squareStamp = (size: number) => {
  const from = -Math.floor((size - 1) / 2)
  const out: [number, number][] = []
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out.push([from + dx, from + dy])
  return out
}

/** The offsets of a round stamp `size` units wide: the units of a size × size circle */
export const roundStamp = (size: number) => {
  const mask = ellipseMask(size, size)
  const from = -Math.floor((size - 1) / 2)
  const out: [number, number][] = []
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) if (mask[dy * size + dx]) out.push([from + dx, from + dy])
  return out
}

export function rasterLine(item: LineItem, width: number, height: number): Cells {
  const cells: Cells = new Map()
  const stamp = squareStamp(item.thickness)
  for (const [px, py] of linePoints(item.x1, item.y1, item.x2, item.y2))
    for (const [dx, dy] of stamp) {
      const x = px + dx
      const y = py + dy
      if (x >= 0 && y >= 0 && x < width && y < height) cells.set(y * width + x, item.color)
    }
  return cells
}

/** Where a text's letters go: its lines, each line's left offset (alignment), and the letters' box (its size in units) */
export function textLayout(item: TextItem) {
  const lines = item.text.split('\n')
  const unit = item.size
  const advance = GLYPH_W * unit + item.letterSpacing
  const lineWidth = (line: string) => (line.length === 0 ? 0 : line.length * advance - item.letterSpacing)
  const w = Math.max(GLYPH_W * unit, ...lines.map(lineWidth))
  const h = lines.length * GLYPH_H * unit + (lines.length - 1) * item.lineSpacing
  const offsets = lines.map((line) => {
    const free = w - lineWidth(line)
    return item.align === 'left' ? 0 : item.align === 'right' ? free : Math.floor(free / 2)
  })
  return { lines, w, h, offsets, advance, lineHeight: GLYPH_H * unit + item.lineSpacing }
}

/** The units of the letters themselves, relative to the text's (x, y) */
function letterUnits(item: TextItem): [number, number][] {
  const { lines, offsets, advance, lineHeight } = textLayout(item)
  const unit = item.size
  const out: [number, number][] = []
  lines.forEach((line, row) => {
    ;[...line].forEach((char, col) => {
      const rows = glyph(char)
      const left = offsets[row] + col * advance
      const top = row * lineHeight
      for (let gy = 0; gy < GLYPH_H; gy++)
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (!rows[gy][gx]) continue
          for (let uy = 0; uy < unit; uy++) for (let ux = 0; ux < unit; ux++) out.push([left + gx * unit + ux, top + gy * unit + uy])
        }
    })
  })
  return out
}

export function rasterText(item: TextItem, width: number, height: number): Cells {
  const cells: Cells = new Map()
  const put = (x: number, y: number, color: Hex) => {
    const bx = item.x + x
    const by = item.y + y
    if (bx >= 0 && by >= 0 && bx < width && by < height) cells.set(by * width + bx, color)
  }
  const letters = letterUnits(item)
  const key = (x: number, y: number) => `${x},${y}`
  const isLetter = new Set(letters.map(([x, y]) => key(x, y)))
  // Shadow first (under everything), then the outline round the letters, then the letters
  if (item.shadow) for (const [x, y] of letters) put(x + item.shadow.dx, y + item.shadow.dy, item.shadow.color)
  if (item.outline)
    for (const [x, y] of letters)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if (!isLetter.has(key(x + dx, y + dy))) put(x + dx, y + dy, item.outline)
  for (const [x, y] of letters) put(x, y, item.color)
  return cells
}

/** The box an item covers (for selecting, its frame and its handles), in units; it may go past the board, which cuts it */
export function boundsOf(item: ShapeItem): Box {
  switch (item.kind) {
    case 'rect':
    case 'ellipse':
      return { x: item.x, y: item.y, w: item.w, h: item.h }
    case 'line': {
      const half = Math.floor((item.thickness - 1) / 2)
      const x = Math.min(item.x1, item.x2) - half
      const y = Math.min(item.y1, item.y2) - half
      return { x, y, w: Math.abs(item.x2 - item.x1) + item.thickness, h: Math.abs(item.y2 - item.y1) + item.thickness }
    }
    case 'text': {
      const { w, h } = textLayout(item)
      const pad = item.outline ? 1 : 0
      const s = item.shadow
      const left = Math.min(-pad, s ? s.dx - pad : 0)
      const top = Math.min(-pad, s ? s.dy - pad : 0)
      const right = Math.max(w + pad, s ? w + s.dx + pad : 0)
      const bottom = Math.max(h + pad, s ? h + s.dy + pad : 0)
      return { x: item.x + left, y: item.y + top, w: right - left, h: bottom - top }
    }
  }
}

const cache = new WeakMap<ShapeItem, { width: number; height: number; cells: Cells }>()

/** A shape's units on a board of this size (kept until the shape changes) */
export function rasterShape(item: ShapeItem, width: number, height: number): Cells {
  const hit = cache.get(item)
  if (hit && hit.width === width && hit.height === height) return hit.cells
  const cells =
    item.kind === 'rect'
      ? rasterRect(item, width, height)
      : item.kind === 'ellipse'
        ? rasterEllipse(item, width, height)
        : item.kind === 'line'
          ? rasterLine(item, width, height)
          : rasterText(item, width, height)
  cache.set(item, { width, height, cells })
  return cells
}

/** The drawing as seen: one colour (or null: nothing, the background shows) per unit, bottom to top, the background first */
export function flatten(d: Drawing, items: Item[] = d.items): (Hex | null)[] {
  const out = new Array<Hex | null>(d.width * d.height).fill(d.background)
  for (const item of items) {
    if (item.kind === 'paint') {
      const cells = item.cells
      for (let i = 0; i < out.length; i++) if (cells[i]) out[i] = cells[i]
    } else for (const [i, color] of rasterShape(item, d.width, d.height)) out[i] = color
  }
  return out
}

/** The topmost shape covering unit (x, y): a text by its letters' box, the others by their own units */
export function shapeAt(d: Drawing, x: number, y: number): ShapeItem | null {
  for (let k = d.items.length - 1; k >= 0; k--) {
    const item = d.items[k]
    if (item.kind === 'paint') continue
    if (item.kind === 'text') {
      const b = boundsOf(item)
      if (x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h) return item
    } else if (rasterShape(item, d.width, d.height).has(y * d.width + x)) return item
  }
  return null
}
