// The Line tool and the Border tool: what a press, drag, click or key does while drawing, and the draft that is painted
// meanwhile (it joins the board only when the drawing is finished, in one undo step). The pure parts are in drawLine.ts,
// drawBorder.ts and borders.ts.
import { useRef, useState, type RefObject } from 'react'
import { addObject, changeObjects } from './boardStore'
import { thin } from '../projects/strokeCodec'
import { borderFromCorners, borderFromShape, borderFromStroke, snapToBorders } from './drawBorder'
import { mergeBorders } from './borders'
import { drawLine, drawShape, isPlain } from './drawLine'
import { getBorderPen, getPen } from './pen'
import { applyView, drawStroke } from './render'
import { LAYER_MAIN, type Board, type BorderObject, type LineObject, type Point, type StyledObject } from './types'
import { clampToBoard, insideBoard, screenToBoard, type Viewport } from './viewport'

/** How near (screen px) another area's outline must be for a new border to snap onto it and merge with it */
export const SNAP_PX = 8
const MERGE_PX = 6
/** How near (screen px) the pointer must be to the first corner of a linear border to close it */
const CLOSE_PX = 10

type Props = {
  mapId: string
  board: Board
  view: Viewport | null
  canvas: RefObject<HTMLCanvasElement | null>
  /** The canvas was drawn on outside the board (the pencil's segments): repaint it */
  repaint: () => void
  /** What a finished drawing added (to select it) */
  onCreated: (ids: number[]) => void
}

type Keys = { shift: boolean; alt: boolean }

const whole = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

export function useDrawTool({ mapId, board, view, canvas, repaint, onCreated }: Props) {
  const [draft, setDraft] = useState<StyledObject | null>(null)
  const [linearOpen, setLinearOpen] = useState(false)
  // A freehand stroke or a dragged shape in progress (what a pointer hold makes)
  const stroke = useRef<Point[] | null>(null)
  const shapeDrag = useRef<{ from: Point; to: Point } | null>(null)
  // Which tool the drag belongs to, and the corners of a linear border so far (clicks, not a hold)
  const forBorder = useRef(false)
  const corners = useRef<Point[]>([])
  const pointer = useRef<Point | null>(null)

  const dropDraft = () => {
    stroke.current = null
    shapeDrag.current = null
    corners.current = []
    pointer.current = null
    setLinearOpen(false)
    setDraft(null)
  }

  const scale = view?.scale ?? 1

  /** A border that is not finished: it shows as the open line it is until it is let go */
  const borderDraft = (points: Point[]): StyledObject | null => {
    const pen = getBorderPen()
    // Thinned the way the finished border is (`thin` keeps what it kept as the stroke grows), so what shows now is what will be saved
    const thinned = pen.style.way === 'exact' ? thin(points, 1 / scale) : points
    return thinned.length ? ({ id: 0, kind: 'line', layer: LAYER_MAIN, name: '', links: [], style: pen.style, points: thinned } as LineObject) : null
  }

  /** The finished drawing for the border tool, snapped to what is near and merged into the areas it touches (Alt: not merged) */
  const finishBorder = (made: Omit<BorderObject, 'id'> | null, alt: boolean) => {
    if (!made) return
    const snapped = { ...made, points: snapToBorders(made.points, board, SNAP_PX / scale).map(whole) }
    if (alt) return onCreated([addObject(mapId, snapped)])
    const added = changeObjects(mapId, mergeBorders(board, snapped, MERGE_PX / scale).change)
    if (added.length > 0) onCreated(added)
  }

  const drawSegment = (from: Point, to: Point) => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || !view) return
    applyView(ctx, view, window.devicePixelRatio || 1)
    drawStroke(ctx, [from, to], getPen().style, view.scale)
  }

  const shapeBox = (keys: Keys) => {
    const drag = shapeDrag.current
    if (!drag) return null
    const pen = forBorder.current ? getBorderPen() : getPen()
    if (!pen.shape) return null
    return drawShape(drag.from, drag.to, { ...pen, shape: pen.shape }, keys.shift)
  }

  const finishShapeOrStroke = (keys: Keys) => {
    if (forBorder.current) {
      const pen = getBorderPen()
      const box = shapeBox(keys)
      if (shapeDrag.current && box) return finishBorder(borderFromShape(box.box, pen.shape!, pen.param, pen.style, pen.fill), keys.alt)
      if (stroke.current) return finishBorder(borderFromStroke(stroke.current, pen.style, pen.fill, CLOSE_PX / scale, scale), keys.alt)
      return
    }
    const pen = getPen()
    const made = shapeDrag.current ? shapeBox(keys) : stroke.current ? drawLine(stroke.current, pen.style, scale) : null
    if (made) onCreated([addObject(mapId, made)])
  }

  /** `closed`: the first corner was clicked again; Enter or a double-click leaves the ends apart */
  const finishLinear = (alt: boolean, closed: boolean) => {
    const pen = getBorderPen()
    const made = borderFromCorners(corners.current, pen.style, pen.fill, closed)
    dropDraft()
    finishBorder(made, alt)
  }

  const linearDraft = () => {
    const points = pointer.current ? [...corners.current, pointer.current] : corners.current
    setDraft(borderDraft(points))
  }

  /**
   * A press with the tool. Returns true when it started something the pointer then holds (a stroke or a shape), false when
   * it was a click (a corner of a linear border) or nothing
   */
  const begin = (at: Point, toolId: 'line' | 'border', keys: Keys): boolean => {
    if (!view) return false
    const start = screenToBoard(view, at)
    if (!insideBoard(start)) return false
    forBorder.current = toolId === 'border'
    const pen = forBorder.current ? getBorderPen() : getPen()
    if (forBorder.current && !pen.shape && pen.style.way === 'straight') {
      // A linear border: each click is a corner; a click on the first one closes it
      const first = corners.current[0]
      if (first && corners.current.length >= 3) {
        const f = { x: view.x + first.x * view.scale, y: view.y + first.y * view.scale }
        if (Math.hypot(f.x - at.x, f.y - at.y) <= CLOSE_PX) {
          finishLinear(keys.alt, true)
          return false
        }
      }
      corners.current = [...corners.current, whole(start)]
      pointer.current = whole(start)
      setLinearOpen(true)
      linearDraft()
      return false
    }
    if (pen.shape) {
      shapeDrag.current = { from: start, to: start }
      return true
    }
    stroke.current = [whole(start)]
    if (forBorder.current) setDraft(borderDraft(stroke.current))
    else if (isPlain(pen.style)) drawSegment(start, { x: start.x + 0.01, y: start.y })
    else setDraft({ id: 0, ...drawLine(stroke.current, pen.style, scale) } as StyledObject)
    return true
  }

  /** The pointer moved while it holds a stroke or a shape */
  const move = (at: Point, keys: Keys) => {
    if (!view) return
    const p = clampToBoard(screenToBoard(view, at))
    if (shapeDrag.current) {
      shapeDrag.current.to = p
      const made = shapeBox(keys)
      if (!made) return setDraft(null)
      if (forBorder.current) {
        const pen = getBorderPen()
        const border = borderFromShape(made.box, pen.shape!, pen.param, pen.style, pen.fill)
        return setDraft(border && ({ id: 0, ...border } as StyledObject))
      }
      return setDraft({ id: 0, ...made } as StyledObject)
    }
    if (!stroke.current) return
    const from = stroke.current.at(-1)!
    const to = whole(p)
    stroke.current.push(to)
    if (forBorder.current) setDraft(borderDraft(stroke.current))
    else if (isPlain(getPen().style)) drawSegment(from, to)
    else setDraft({ id: 0, ...drawLine(stroke.current, getPen().style, scale) } as StyledObject)
  }

  /** The pointer moved over the board with nothing held: a linear border's next edge follows it */
  const hover = (at: Point) => {
    if (!view || corners.current.length === 0) return
    pointer.current = whole(clampToBoard(screenToBoard(view, at)))
    linearDraft()
  }

  /** The hold ended: the drawing is made (a drag that made nothing makes nothing) */
  const end = (keys: Keys) => {
    finishShapeOrStroke(keys)
    stroke.current = null
    shapeDrag.current = null
    setDraft(null)
    repaint()
  }

  const cancel = () => {
    const had = draft !== null || stroke.current !== null || shapeDrag.current !== null || corners.current.length > 0
    dropDraft()
    if (had) repaint()
  }

  /** A double-click closes a linear border */
  const doubleClick = (alt: boolean) => {
    if (corners.current.length >= 2) finishLinear(alt, false)
  }

  /** Enter closes a linear border, Backspace takes back its last corner, Esc drops it. True when the key was used */
  const handleKey = (key: string, alt: boolean): boolean => {
    if (corners.current.length === 0) return false
    if (key === 'enter') finishLinear(alt, false)
    else if (key === 'backspace') {
      corners.current = corners.current.slice(0, -1)
      if (corners.current.length === 0) dropDraft()
      else linearDraft()
    } else if (key === 'escape') dropDraft()
    else return false
    return true
  }

  return { draft, linearOpen, begin, move, hover, end, cancel, doubleClick, handleKey }
}
