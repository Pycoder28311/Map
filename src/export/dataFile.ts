// The data file Download gives (`<name>.pixel.json`), the one to send to Claude: the board's size, a palette of one character per colour
// and the drawing as rows of those characters, one per unit ('.': empty), the form the Map app's hand-drawn sprites use. It also holds the
// whole drawing, so Open brings back every object editable. The same form of the drawing is what the browser keeps (store/library.ts).
import { normalizeDrawing } from '../model/normalize'
import { flatten } from '../model/raster'
import type { Drawing, Hex, Item } from '../model/types'

export const FORMAT = 'map-pixel-asset'

/** The characters a palette uses, in order: 62 colours at most */
export const PALETTE_KEYS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
export const EMPTY = '.'

export class TooManyColours extends Error {
  constructor(count: number) {
    super(`This drawing uses ${count} colours; a data file holds ${PALETTE_KEYS.length} at most. Merge some colours first.`)
  }
}

/** Cells as rows of characters with their palette (colours in the order they first appear, top to bottom, left to right) */
export function toRows(cells: (Hex | null)[], width: number, height: number): { palette: Record<string, Hex>; rows: string[] } {
  const keyOf = new Map<Hex, string>()
  const palette: Record<string, Hex> = {}
  const rows: string[] = []
  for (let y = 0; y < height; y++) {
    let row = ''
    for (let x = 0; x < width; x++) {
      const color = cells[y * width + x]
      if (!color) {
        row += EMPTY
        continue
      }
      let key = keyOf.get(color)
      if (key === undefined) {
        if (keyOf.size >= PALETTE_KEYS.length) throw new TooManyColours(new Set(cells.filter(Boolean)).size)
        key = PALETTE_KEYS[keyOf.size]
        keyOf.set(color, key)
        palette[key] = color
      }
      row += key
    }
    rows.push(row)
  }
  return { palette, rows }
}

/** Rows of characters back to cells */
export function fromRows(rows: string[], palette: Record<string, Hex>, width: number, height: number): (Hex | null)[] {
  const cells = new Array<Hex | null>(width * height).fill(null)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const key = rows[y]?.[x]
      if (key && key !== EMPTY && palette[key]) cells[y * width + x] = palette[key]
    }
  return cells
}

/** A drawing as JSON: the same, but the paint layer's cells as rows with their own palette (smaller, and readable) */
export function serializeDrawing(d: Drawing) {
  return {
    ...d,
    items: d.items.map((item) => (item.kind === 'paint' ? { kind: 'paint' as const, id: item.id, ...toRows(item.cells, d.width, d.height) } : item)),
  }
}

type SerializedItem = Exclude<Item, { kind: 'paint' }> | { kind: 'paint'; id: string; rows: string[]; palette: Record<string, Hex> }

/** A drawing from its JSON, normalized (whole units, in the board), or null when it isn't one */
export function deserializeDrawing(value: unknown): Drawing | null {
  if (!value || typeof value !== 'object') return null
  const d = value as Omit<Drawing, 'items'> & { items?: SerializedItem[] }
  if (typeof d.width !== 'number' || typeof d.height !== 'number' || !Array.isArray(d.items)) return null
  const items = d.items.map((item): Item => (item.kind === 'paint' ? { kind: 'paint', id: item.id, cells: fromRows(item.rows ?? [], item.palette ?? {}, d.width, d.height) } : item))
  return normalizeDrawing({ ...d, items } as Drawing)
}

/** The data file of a drawing (throws TooManyColours) */
export function dataFile(d: Drawing) {
  const { palette, rows } = toRows(flatten(d), d.width, d.height)
  return { format: FORMAT, version: 1, name: d.name, width: d.width, height: d.height, palette, rows, drawing: serializeDrawing(d) }
}

/** The drawing in a data file's text (or a bare drawing's JSON), or null */
export function readDataFile(text: string): Drawing | null {
  try {
    const parsed = JSON.parse(text) as { format?: string; drawing?: unknown }
    return deserializeDrawing(parsed.format === FORMAT ? parsed.drawing : parsed)
  } catch {
    return null
  }
}

/** A file name from the drawing's name */
export const fileBase = (name: string) => name.trim().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'asset'
