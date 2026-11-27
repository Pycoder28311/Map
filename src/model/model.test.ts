import { describe, expect, it } from 'vitest'
import { dataFile, readDataFile, toRows } from '../export/dataFile'
import { mirrorCopies, mirrorPoints } from './mirror'
import { newDrawing, normalizeDrawing, normalizeShape, resizeBoard } from './normalize'
import { floodFill, stampOf, stroke } from './paint'
import { boundsOf, flatten, rasterEllipse, rasterLine, rasterRect, rasterText, shapeAt, textLayout } from './raster'
import type { Drawing, EllipseItem, Hex, LineItem, RectItem, ShapeItem, TextItem } from './types'

const K = '#000000'
const W = '#ffffff'
const R = '#ff0000'

/** Cells as rows of characters for reading tests: k black, w white, r red, '.' empty */
const NAMES: Record<Hex, string> = { [K]: 'k', [W]: 'w', [R]: 'r' }
const picture = (cells: Map<number, Hex> | (Hex | null)[], width: number, height: number) => {
  const get = (i: number) => (cells instanceof Map ? cells.get(i) : cells[i]) ?? null
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (get(y * width + x) ? NAMES[get(y * width + x)!] : '.')).join(''))
}

const rect = (patch: Partial<RectItem> = {}): RectItem => ({ kind: 'rect', id: 'r', x: 0, y: 0, w: 5, h: 3, border: { color: K, thickness: 1 }, fill: W, steps: 0, ...patch })
const text = (patch: Partial<TextItem> = {}): TextItem => ({
  kind: 'text', id: 't', x: 0, y: 0, text: 'I', size: 1, color: K, letterSpacing: 1, lineSpacing: 1, align: 'left', outline: null, shadow: null, ...patch,
})

/** Every number in a value, at any depth */
const numbers = (value: unknown): number[] =>
  typeof value === 'number' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(numbers) : []

describe('whole units only', () => {
  it('rounds, clamps and keeps every number a whole unit inside the board', () => {
    const shapes: ShapeItem[] = [
      rect({ x: 2.4, y: -3, w: 7.6, h: 200, border: { color: K, thickness: 9.2 }, steps: 3.7 }),
      { kind: 'ellipse', id: 'e', x: 60.5, y: 1.2, w: 10.1, h: 0, border: { color: K, thickness: -1 }, fill: null },
      { kind: 'line', id: 'l', x1: -4, y1: 2.5, x2: 99, y2: 3.49, thickness: 0.2, color: K },
      text({ x: 1.6, y: 2.2, letterSpacing: 1.5, lineSpacing: -2, size: 2.6 as never, shadow: { color: K, dx: 1.5, dy: -0.4 } }),
    ]
    for (const shape of shapes) {
      const n = normalizeShape(shape, 64, 32)
      for (const value of numbers(n)) expect(Number.isInteger(value)).toBe(true)
      if (n.kind === 'rect' || n.kind === 'ellipse') {
        expect(n.x + n.w).toBeLessThanOrEqual(64)
        expect(n.y + n.h).toBeLessThanOrEqual(32)
        expect(n.w).toBeGreaterThanOrEqual(1)
        expect(n.h).toBeGreaterThanOrEqual(1)
        expect(n.border.thickness).toBeLessThanOrEqual(Math.ceil(Math.min(n.w, n.h) / 2))
      }
    }
    expect(normalizeShape(rect({ w: 8, h: 4, steps: 9 }), 64, 64)).toMatchObject({ steps: 2 })
  })

  it('a drawing always has one paint layer of exactly width × height', () => {
    const d = normalizeDrawing({ version: 1, name: '', width: 10.4, height: 3, exportScale: 0, background: '#ABC', items: [] } as Drawing)
    expect(d).toMatchObject({ width: 10, height: 3, exportScale: 1, background: '#aabbcc', name: 'asset' })
    expect(d.items).toHaveLength(1)
    expect(d.items[0]).toMatchObject({ kind: 'paint' })
    expect((d.items[0] as { cells: unknown[] }).cells).toHaveLength(30)
  })
})

describe('rasters', () => {
  it('a rectangle: a border band of its thickness, the fill inside', () => {
    expect(picture(rasterRect(rect(), 5, 3), 5, 3)).toEqual(['kkkkk', 'kwwwk', 'kkkkk'])
    expect(picture(rasterRect(rect({ w: 6, h: 6, border: { color: K, thickness: 2 } }), 6, 6), 6, 6)).toEqual([
      'kkkkkk', 'kkkkkk', 'kkwwkk', 'kkwwkk', 'kkkkkk', 'kkkkkk',
    ])
    expect(picture(rasterRect(rect({ border: { color: K, thickness: 0 }, fill: null }), 5, 3), 5, 3)).toEqual(['.....', '.....', '.....'])
  })

  it('a stepped rectangle: corners cut in stairs, the border following them', () => {
    expect(picture(rasterRect(rect({ w: 8, h: 6, steps: 2 }), 8, 6), 8, 6)).toEqual([
      '..kkkk..',
      '.kkwwkk.',
      'kkwwwwkk',
      'kkwwwwkk',
      '.kkwwkk.',
      '..kkkk..',
    ])
  })

  it('an ellipse in a square box is a symmetric circle', () => {
    const e: EllipseItem = { kind: 'ellipse', id: 'e', x: 0, y: 0, w: 7, h: 7, border: { color: K, thickness: 1 }, fill: W }
    const rows = picture(rasterEllipse(e, 7, 7), 7, 7)
    expect(rows).toEqual([...rows].reverse())
    for (const row of rows) expect(row).toBe([...row].reverse().join(''))
    expect(rows[3]).toBe('kwwwwwk')
    expect(rows[0]).toMatch(/^\.+k+\.+$/)
  })

  it('a line has no gaps and its thickness', () => {
    const l: LineItem = { kind: 'line', id: 'l', x1: 0, y1: 0, x2: 4, y2: 4, thickness: 1, color: K }
    expect(picture(rasterLine(l, 5, 5), 5, 5)).toEqual(['k....', '.k...', '..k..', '...k.', '....k'])
    expect(rasterLine({ ...l, x2: 4, y2: 0, thickness: 2 }, 5, 5).size).toBe(10)
  })

  it('text: each font pixel is size × size units; outline round the letters; shadow under them', () => {
    expect(picture(rasterText(text(), 5, 7), 5, 7)).toEqual(['.kkk.', '..k..', '..k..', '..k..', '..k..', '..k..', '.kkk.'])
    expect(rasterText(text({ size: 2 }), 10, 14).size).toBe(4 * rasterText(text(), 5, 7).size)
    const outlined = rasterText(text({ x: 1, y: 1, outline: R }), 7, 9)
    expect(picture(outlined, 7, 9)[0]).toBe('.rrrrr.')
    expect(textLayout(text({ text: 'Hi\nthere', letterSpacing: 1 }))).toMatchObject({ w: 29, h: 15 })
    expect(boundsOf(text({ x: 4, y: 4, outline: R, shadow: { color: K, dx: 2, dy: 1 } }))).toEqual({ x: 3, y: 3, w: 9, h: 10 })
  })

  it('flatten: bottom to top, null lets the one below show; shapeAt finds the topmost', () => {
    const d = newDrawing(5, 3)
    const paint = d.items[0] as { cells: (Hex | null)[] }
    paint.cells[0] = R
    const drawing: Drawing = { ...d, items: [d.items[0], rect({ id: 'a', x: 1, w: 3, h: 3, border: { color: K, thickness: 1 }, fill: null })] }
    expect(picture(flatten(drawing), 5, 3)).toEqual(['rkkk.', '.k.k.', '.kkk.'])
    expect(shapeAt(drawing, 1, 1)?.id).toBe('a')
    expect(shapeAt(drawing, 2, 1)).toBeNull() // its hollow middle
  })
})

describe('painting', () => {
  it('a brush stroke has no gaps; the eraser clears; mirror paints the other side too', () => {
    const cells = new Array<Hex | null>(25).fill(null)
    expect(stroke(cells, 5, 5, [0, 0], [4, 0], stampOf('square', 1), K, { x: false, y: false })).toBe(true)
    expect(picture(cells, 5, 5)[0]).toBe('kkkkk')
    stroke(cells, 5, 5, [1, 0], [1, 0], stampOf('square', 1), null, { x: false, y: false })
    expect(picture(cells, 5, 5)[0]).toBe('k.kkk')
    const mirrored = new Array<Hex | null>(25).fill(null)
    stroke(mirrored, 5, 5, [0, 1], [0, 1], stampOf('square', 1), K, { x: true, y: true })
    expect(picture(mirrored, 5, 5)).toEqual(['.....', 'k...k', '.....', 'k...k', '.....'])
    expect(stampOf('round', 3)).toHaveLength(9 - 0) // a 3-unit circle is the full 3 × 3
    expect(stampOf('round', 5).length).toBeLessThan(25)
  })

  it('the fill bucket fills the area that looks the same, joined by its sides', () => {
    const seen: (Hex | null)[] = [null, K, null, null, K, null, K, K, null]
    const cells = new Array<Hex | null>(9).fill(null)
    floodFill(cells, seen, 3, 3, 0, 0, R)
    expect(picture(cells, 3, 3)).toEqual(['r..', 'r..', '...'])
  })

  it('mirror points and mirror copies of a shape', () => {
    expect(mirrorPoints(1, 1, 6, 4, { x: true, y: false })).toEqual([[1, 1], [4, 1]])
    expect(mirrorPoints(2, 0, 5, 1, { x: true, y: true })).toEqual([[2, 0]]) // on both middle lines: its own copy
    const [copy] = mirrorCopies(rect({ x: 1, y: 0, w: 2, h: 1 }), { x: true, y: false }, 10, 10)
    expect(copy).toMatchObject({ kind: 'rect', x: 7, w: 2 })
    expect(mirrorCopies(rect(), { x: true, y: true }, 10, 10)).toHaveLength(3)
  })
})

describe('board and data file', () => {
  it('resizing keeps the anchored side and moves the paint and the objects', () => {
    const d = newDrawing(4, 4)
    ;(d.items[0] as { cells: (Hex | null)[] }).cells[0] = R
    const grown = resizeBoard({ ...d, items: [...d.items, rect({ x: 0, y: 0, w: 2, h: 2 })] }, 6, 6, 'bottom-right')
    expect((grown.items[0] as { cells: (Hex | null)[] }).cells[2 * 6 + 2]).toBe(R)
    expect(grown.items[1]).toMatchObject({ x: 2, y: 2 })
  })

  it('rows and palette in the order colours appear; a data file opens back to the same drawing', () => {
    expect(toRows([K, null, W, K], 2, 2)).toEqual({ palette: { a: K, b: W }, rows: ['a.', 'ba'] })
    const d = newDrawing(8, 6, 'book card')
    ;(d.items[0] as { cells: (Hex | null)[] }).cells[5] = R
    const drawing: Drawing = { ...d, items: [...d.items, rect({ x: 1, y: 1, w: 4, h: 3 }), text({ x: 2, y: 0, text: 'A' })] }
    const file = dataFile(drawing)
    expect(file).toMatchObject({ format: 'map-pixel-asset', width: 8, height: 6, name: 'book card' })
    expect(file.rows).toHaveLength(6)
    for (const row of file.rows) expect(row).toHaveLength(8)
    const back = readDataFile(JSON.stringify(file))!
    expect(flatten(back)).toEqual(flatten(drawing))
    expect(back.items.map((i) => i.kind)).toEqual(['paint', 'rect', 'text'])
    expect(readDataFile('not json')).toBeNull()
  })
})
