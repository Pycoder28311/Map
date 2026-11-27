// The one place that keeps every stored number a whole unit (types.ts): rounds, clamps to the board and to sensible limits. Every edit of
// an item or of the drawing goes through here, so no fractional or negative value can enter the data.
import { textLayout } from './raster'
import { LIMITS, PAINT_ID, TEXT_SIZES, type Drawing, type Hex, type Item, type PaintItem, type ShapeItem, type TextSize } from './types'

/** A whole number between min and max (NaN: min) */
export const int = (value: number, min: number, max: number) => {
  const n = Math.round(Number.isFinite(value) ? value : min)
  return Math.min(max, Math.max(min, n))
}

const HEX = /^#[0-9a-f]{6}$/
/** A colour as #rrggbb, lowercase (#abc is widened); anything else: null */
export function hex(value: unknown): Hex | null {
  if (typeof value !== 'string') return null
  let v = value.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(v)) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return HEX.test(v) ? v : null
}

const colour = (value: unknown, fallback: Hex) => hex(value) ?? fallback

/** One shape, whole units, inside a board of this size */
export function normalizeShape(item: ShapeItem, width: number, height: number): ShapeItem {
  switch (item.kind) {
    case 'rect':
    case 'ellipse': {
      const w = int(item.w, 1, width)
      const h = int(item.h, 1, height)
      const x = int(item.x, 0, width - w)
      const y = int(item.y, 0, height - h)
      // A border no thicker than half the shape (else it is all border)
      const thickness = int(item.border.thickness, 0, Math.min(LIMITS.thicknessMax, Math.ceil(Math.min(w, h) / 2)))
      const border = { color: colour(item.border.color, '#000000'), thickness }
      const fill = item.fill === null ? null : colour(item.fill, '#ffffff')
      if (item.kind === 'ellipse') return { ...item, x, y, w, h, border, fill }
      const steps = int(item.steps, 0, Math.min(LIMITS.stepsMax, Math.floor(Math.min(w, h) / 2)))
      return { ...item, x, y, w, h, border, fill, steps }
    }
    case 'line':
      return {
        ...item,
        x1: int(item.x1, 0, width - 1),
        y1: int(item.y1, 0, height - 1),
        x2: int(item.x2, 0, width - 1),
        y2: int(item.y2, 0, height - 1),
        thickness: int(item.thickness, 1, LIMITS.thicknessMax),
        color: colour(item.color, '#000000'),
      }
    case 'text': {
      const size = (TEXT_SIZES as readonly number[]).includes(item.size) ? item.size : (int(item.size, 1, 4) as TextSize)
      // Its letters' box stays inside the board when it fits (a longer text is cut at the edge)
      const box = textLayout({ ...item, size, text: String(item.text ?? ''), letterSpacing: int(item.letterSpacing, 0, LIMITS.spacingMax), lineSpacing: int(item.lineSpacing, 0, LIMITS.spacingMax) })
      return {
        ...item,
        x: int(item.x, 0, Math.max(0, width - box.w)),
        y: int(item.y, 0, Math.max(0, height - box.h)),
        text: String(item.text ?? '').slice(0, 500),
        size,
        color: colour(item.color, '#000000'),
        letterSpacing: int(item.letterSpacing, 0, LIMITS.spacingMax),
        lineSpacing: int(item.lineSpacing, 0, LIMITS.spacingMax),
        align: item.align === 'center' || item.align === 'right' ? item.align : 'left',
        outline: item.outline === null ? null : colour(item.outline, '#000000'),
        shadow:
          item.shadow === null
            ? null
            : { color: colour(item.shadow.color, '#000000'), dx: int(item.shadow.dx, -LIMITS.shadowMax, LIMITS.shadowMax), dy: int(item.shadow.dy, -LIMITS.shadowMax, LIMITS.shadowMax) },
      }
    }
  }
}

/** The paint layer, exactly width × height cells of a colour or null */
export function normalizePaint(item: PaintItem, width: number, height: number): PaintItem {
  const size = width * height
  const cells = new Array<Hex | null>(size)
  for (let i = 0; i < size; i++) cells[i] = item.cells[i] === null || item.cells[i] === undefined ? null : hex(item.cells[i])
  return { kind: 'paint', id: PAINT_ID, cells }
}

export const emptyPaint = (width: number, height: number): PaintItem => ({ kind: 'paint', id: PAINT_ID, cells: new Array(width * height).fill(null) })

/** A whole drawing: its board in limits, one paint layer (added at the bottom if missing), every item normalized */
export function normalizeDrawing(d: Drawing): Drawing {
  const width = int(d.width, LIMITS.boardMin, LIMITS.boardMax)
  const height = int(d.height, LIMITS.boardMin, LIMITS.boardMax)
  let hasPaint = false
  const items: Item[] = []
  for (const item of d.items ?? []) {
    if (item.kind === 'paint') {
      if (hasPaint) continue
      hasPaint = true
      items.push(normalizePaint(item, width, height))
    } else if (item.kind === 'rect' || item.kind === 'ellipse' || item.kind === 'line' || item.kind === 'text') {
      items.push(normalizeShape(item, width, height))
    }
  }
  if (!hasPaint) items.unshift(emptyPaint(width, height))
  return {
    version: 1,
    name: String(d.name ?? 'asset').trim().slice(0, 80) || 'asset',
    width,
    height,
    exportScale: int(d.exportScale, LIMITS.scaleMin, LIMITS.scaleMax),
    background: d.background === null ? null : hex(d.background),
    items,
  }
}

/** A new empty drawing */
export const newDrawing = (width = 64, height = 64, name = 'asset'): Drawing =>
  normalizeDrawing({ version: 1, name, width, height, exportScale: 4, background: null, items: [] })

export type Anchor = 'top-left' | 'top' | 'top-right' | 'left' | 'center' | 'right' | 'bottom-left' | 'bottom' | 'bottom-right'

/**
 * The board grown or cropped to width × height, keeping the `anchor` side in place: the paint layer's cells and every object move with it
 * (objects then clamped inside the new board)
 */
export function resizeBoard(d: Drawing, width: number, height: number, anchor: Anchor): Drawing {
  const w = int(width, LIMITS.boardMin, LIMITS.boardMax)
  const h = int(height, LIMITS.boardMin, LIMITS.boardMax)
  const horizontal = anchor.includes('left') ? 0 : anchor.includes('right') ? 1 : 0.5
  const vertical = anchor.startsWith('top') ? 0 : anchor.startsWith('bottom') ? 1 : 0.5
  const dx = Math.round((w - d.width) * horizontal)
  const dy = Math.round((h - d.height) * vertical)
  const items = d.items.map((item): Item => {
    if (item.kind === 'paint') {
      const cells = new Array<Hex | null>(w * h).fill(null)
      for (let y = 0; y < d.height; y++)
        for (let x = 0; x < d.width; x++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) cells[ny * w + nx] = item.cells[y * d.width + x]
        }
      return { ...item, cells }
    }
    if (item.kind === 'line') return { ...item, x1: item.x1 + dx, x2: item.x2 + dx, y1: item.y1 + dy, y2: item.y2 + dy }
    return { ...item, x: item.x + dx, y: item.y + dy }
  })
  return normalizeDrawing({ ...d, width: w, height: h, items })
}
