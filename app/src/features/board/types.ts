// What a map's board holds. Lines and borders keep the pencil's geometry (simplified whole-number points,
// see features/projects/strokeCodec.ts); everything is saved by boardCodec.ts. In memory: boardStore.ts.
import type { Point } from '../projects/strokeCodec'

export type { Point }

/** 0 is the background (locked; the board's picture goes there later), 1 is where everything is drawn */
export type Layer = number
export const LAYER_BACKGROUND: Layer = 0
export const LAYER_MAIN: Layer = 1

/** A link to a sidebar object (a note, a project…) or to another object of the same board */
export type Link = { to: 'sidebar'; id: string } | { to: 'board'; id: number }

export const LINE_TYPES = ['solid', 'dashed', 'double', 'diagonal'] as const
export const DRAWING_WAYS = ['exact', 'rounded', 'straight', 'corners'] as const

export type Style = {
  /** '#rrggbb' */
  color: string
  /** 0–100 */
  opacity: number
  /** Whole board units */
  thickness: number
  /** The same width however far the map is zoomed */
  fixedWidth: boolean
  type: (typeof LINE_TYPES)[number]
  /** Dashed and diagonal: gap and part size; double: gap. 0 otherwise */
  gap: number
  part: number
  /** Which ends have an arrow, its look (an index into the button styles) and size. style and size are 0 with no arrow */
  arrow: { start: boolean; end: boolean; style: number; size: number }
  /** How the line is drawn: exact is the mouse's own path */
  way: (typeof DRAWING_WAYS)[number]
  /** exact: softness 0–100; corners: the corner degrees; 0 for the others */
  amount: number
}

/** A point's curve handles (Figma vectors), as offsets from the point */
export type Handle = { inX: number; inY: number; outX: number; outY: number }

/** `handles`, when there, has one entry per point */
export type Path = { points: Point[]; handles?: Handle[] }

/** The shapes of the shape tool. A shape is saved as its index here, so new ones are only ever added at the end */
export const SHAPE_TYPES = [
  'rect',
  'roundRect',
  'ellipse',
  'triangle',
  'rightTriangle',
  'diamond',
  'pentagon',
  'hexagon',
  'star',
  'arrow',
  'heart',
] as const
export type ShapeType = (typeof SHAPE_TYPES)[number]

export type Base = {
  /** Unique in its board */
  id: number
  layer: Layer
  name: string
  links: Link[]
}

export type LineObject = Base & { kind: 'line'; style: Style } & Path
/** Always closed: the last point joins the first */
/** A fill: the inside of a shape or an area */
export type Fill = { color: string; opacity: number }
/** Per-edge colours of an area that came from borders of different colours: from point `from` on, edges are `color` */
export type EdgeRun = { from: number; color: string }
export type BorderObject = Base & {
  kind: 'border'
  style: Style
  /** The area's inside; null: none */
  fill: Fill | null
  /** Shown under the area's name */
  description: string
  /** Empty or absent: the whole outline is `style.color` */
  edges?: EdgeRun[]
} & Path
export type ShapeObject = Base & {
  kind: 'shape'
  style: Style
  shape: ShapeType
  box: { x: number; y: number; w: number; h: number }
  /** Degrees */
  rotation: number
  /** The shape's one number: corner radius, star points… */
  param: number
  fill: Fill | null
}
/** A stretch of text with its own marks; what a mark leaves out comes from the text object (colour, size) */
export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string; size?: number }
export type TextAlign = 'left' | 'center' | 'right'
export type TextObject = Base & {
  kind: 'text'
  /** The top-left corner of its box (before rotation) */
  anchor: Point
  /** The plain text: always what `runs` say, for search and for readers that know nothing of runs */
  text: string
  /** Mixed styles; absent: all of `text` in the object's own style */
  runs?: TextRun[]
  /** The width it wraps at; 0: it grows with what is typed */
  width: number
  /** Degrees, about the box's centre */
  rotation: number
  align: TextAlign
  /** The font size of what a run does not size itself (board units) */
  size: number
  color: string
  opacity: number
  /** Follows this object (a border, point or line): moves with it */
  attach?: number
  /** Is the name of the area it is attached to */
  isName?: boolean
}
/** The runs of a text (its plain text as one run when it has none) */
export const runsOf = (o: TextObject): TextRun[] => o.runs ?? [{ text: o.text }]
export const POINT_LABELS = ['city', 'country', 'mountain', 'sea', 'river', 'lake', 'island', 'organization', 'other'] as const
export type PointLabel = (typeof POINT_LABELS)[number]
export const PIN_ICONS = ['pin', 'city', 'building', 'mountain', 'water', 'flag', 'star', 'tree', 'globe', 'anchor', 'home', 'heart'] as const
export type PinIcon = (typeof PIN_ICONS)[number]

/** A pin on the map: `anchor` is its tip */
export type PointObject = Base & {
  kind: 'point'
  anchor: Point
  label: PointLabel
  icon: PinIcon
  color: string
  /** The id of the banner picture in the image store */
  banner?: string
  /** The description as TipTap's JSON, written out ('' or missing: none) */
  description?: string
}

export type BoardObject = LineObject | BorderObject | ShapeObject | TextObject | PointObject
/** The kinds that are painted with a Style */
export type StyledObject = LineObject | BorderObject | ShapeObject
export type ObjectKind = BoardObject['kind']

export type Board = {
  /** The id the next object gets */
  nextId: number
  /** Bottom to top inside each layer */
  objects: BoardObject[]
}

/** The number each kind has in the file. 6 is reserved for the board's images */
export const KIND_NUMBER: Record<ObjectKind, number> = { line: 1, border: 2, shape: 3, text: 4, point: 5 }
export const KIND_IMAGE = 6

export const emptyBoard = (): Board => ({ nextId: 1, objects: [] })
