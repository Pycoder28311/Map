// What a map's board holds. Lines and borders keep the pencil's geometry (simplified whole-number points,
// see features/projects/strokeCodec.ts); everything is saved by boardCodec.ts. In memory: boardStore.ts.
import type { Point } from '../projects/strokeCodec'

export type { Point }

/** 0 is the background (locked; the board's picture goes there later), 1 is where everything is drawn */
export type Layer = number
export const LAYER_BACKGROUND: Layer = 0
export const LAYER_MAIN: Layer = 1

/** A link to a sidebar object (a note, an object card…) or to another object of the same board */
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
  /** An outline round the line: its colour, how far it reaches out of the line on each side (board units) and its opacity 1–100. Absent: none */
  stroke?: { color: string; width: number; opacity: number }
  /** A shadow: its colour, how soft it is and how far it falls (down and right, board units). Absent: none */
  shadow?: { color: string; blur: number; distance: number }
  /** How round the corners of the path are, 0–100 (whatever the drawing way). Absent: none, except that the exact way's `amount` is its softness (older maps) */
  softness?: number
  /** A road texture painted along the line: an index into the roads (roadTextures.ts). Absent or 0: none */
  road?: number
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
export type Fill = {
  color: string
  opacity: number
  /** An index into the textures (fillTextures.ts); absent or 0: solid */
  texture?: number
  /** The id of a picture in the image store that fills the area */
  image?: string
}
/** Per-edge colours of an area that came from borders of different colours: from point `from` on, edges are `color` */
export type EdgeRun = { from: number; color: string }
export type BorderObject = Base & {
  kind: 'border'
  style: Style
  /** The border's ends are not joined: it is a line that can be given a name and a description, not an area (no inside, nothing merges with it) */
  open?: boolean
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
/** A run as it is laid out: with the text object's own font and weight added (never saved) */
export type LaidRun = TextRun & { weight?: number; family?: string; oblique?: boolean; underlineColor?: string; strikeColor?: string; spacing?: number }
/** The frames a text can sit in. Saved as the index, so new ones are only ever added at the end */
export const BOX_SHAPES = ['square', 'corners'] as const
export type BoxShape = (typeof BOX_SHAPES)[number]
export type TextAlign = 'left' | 'center' | 'right' | 'justify'
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
  /** The text keeps its size on the screen as the map is zoomed (absent: it grows and shrinks with the map) */
  fixedSize?: boolean
  /** The font, as an index into fonts.ts (absent: the first, the system's) */
  font?: number
  /** CSS weight 100–900 of all the text (absent: 400); a bold mark on a stretch makes it at least 700 */
  weight?: number
  /** Marks of the whole text, on top of those of its runs */
  italic?: boolean
  underline?: boolean
  strike?: boolean
  /** The italic slants the letters (oblique) instead of the font's own italic shapes */
  oblique?: boolean
  /** The colours of the underline and the strikethrough (absent: the text's colour) */
  underlineColor?: string
  strikeColor?: string
  /** An outline round the letters: its colour (absent: black) and width (absent or 0: none) */
  strokeColor?: string
  strokeWidth?: number
  /** 1–100, on top of the text's own opacity (absent: 100) */
  strokeOpacity?: number
  /** A shadow: its colour (absent: black), how soft it is (its size) and how far it falls. Absent or all 0: none */
  shadowColor?: string
  shadowBlur?: number
  /** How far the shadow falls right (the X offset; negative: left) */
  shadowDistance?: number
  /** How far it falls down (the Y offset; negative: up). Absent: as far as `shadowDistance` (older texts) */
  shadowY?: number
  /** The text sits inside a square drawn round it, in `boxColor` (absent: the text's colour) */
  boxed?: boolean
  /** What the frame looks like (absent: a square) */
  boxShape?: BoxShape
  boxColor?: string
  /** Extra space between the lines (board units; absent or 0: the font's own)  */
  lineGap?: number
  /** Extra space after every letter (board units; absent or 0: the font's own) */
  spacing?: number
  /** -100…100: bends the text along an arc (0 or absent: straight; textCurve.ts) */
  curve?: number
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
