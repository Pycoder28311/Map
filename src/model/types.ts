// The drawing as data. One rule above all: every position, size, thickness and step is a whole number of pixel units (an integer
// ≥ 0). Screen pixels exist only while drawing on screen (board/), real pixels only in the PNG (export/). normalize.ts keeps the rule.

/** A colour, as #rrggbb */
export type Hex = string

export type Border = { color: Hex; thickness: number }
export type Shadow = { color: Hex; dx: number; dy: number }

/** What the brush, the eraser and the fill bucket paint on: one colour (or nothing) per unit of the board, row by row */
export type PaintItem = { kind: 'paint'; id: string; cells: (Hex | null)[] }

/** A rectangle; `steps` > 0 cuts its corners in a staircase that many units deep (the app's buttons and frames) */
export type RectItem = { kind: 'rect'; id: string; x: number; y: number; w: number; h: number; border: Border; fill: Hex | null; steps: number }

export type EllipseItem = { kind: 'ellipse'; id: string; x: number; y: number; w: number; h: number; border: Border; fill: Hex | null }

export type LineItem = { kind: 'line'; id: string; x1: number; y1: number; x2: number; y2: number; thickness: number; color: Hex }

export type TextAlign = 'left' | 'center' | 'right'
export const TEXT_SIZES = [1, 2, 3, 4] as const
export type TextSize = (typeof TEXT_SIZES)[number]

/** Text in the pixel font (font5x7.ts): each font pixel is `size × size` units. (x, y): the top left of its letters' box */
export type TextItem = {
  kind: 'text'
  id: string
  x: number
  y: number
  text: string
  size: TextSize
  color: Hex
  letterSpacing: number
  lineSpacing: number
  align: TextAlign
  outline: Hex | null
  shadow: Shadow | null
}

export type ShapeItem = RectItem | EllipseItem | LineItem | TextItem
export type Item = PaintItem | ShapeItem
export type ShapeKind = ShapeItem['kind']

export type Drawing = {
  version: 1
  name: string
  /** The board, in units */
  width: number
  height: number
  /** Real pixels per unit in the PNG (an integer) */
  exportScale: number
  /** null: transparent */
  background: Hex | null
  /** Bottom to top; the paint layer is one of them, with a place in the order like the objects */
  items: Item[]
}

/** The id of the one paint layer */
export const PAINT_ID = 'paint'

export const LIMITS = {
  boardMin: 1,
  boardMax: 512,
  scaleMin: 1,
  scaleMax: 16,
  brushMax: 16,
  thicknessMax: 64,
  stepsMax: 64,
  spacingMax: 32,
  shadowMax: 16,
} as const

/** Units on a board (x, y) as one index */
export const indexOf = (width: number, x: number, y: number) => y * width + x

let seq = 0
/** A new item id */
export const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export const isShape = (item: Item): item is ShapeItem => item.kind !== 'paint'
