// The Line tool and the Border tool: what a press, drag, click or key does while drawing, and the draft that is painted
// meanwhile (it joins the board only when the drawing is finished, in one undo step). The pure parts are in drawLine.ts,
// drawBorder.ts and borders.ts.
import { useRef, useState, type RefObject } from 'react'
import { addObject, changeObjects } from './boardStore'
import { applyChange, type Change } from './changes'
import { hitPathPoint, movePoint } from './pathEdit'
import { thin } from '../projects/strokeCodec'
import { borderFromCorners, borderFromShape, borderFromStroke, snapToBorders, snapToEndpoint, snapToVertex } from './drawBorder'
import { joinOpenBorders, mergeBorders } from './borders'
import { drawLine, drawShape, isPlain } from './drawLine'
import { hitTestPart } from './hit'
import { HIT_PX } from './useMouseTool'
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
  // The border under the pointer while nothing is being drawn: its points show faintly
  const [hovered, setHovered] = useState<number | null>(null)
  // Whether it is on its edge (a press there picks it)
  const [onEdge, setOnEdge] = useState(false)
  // The pointer is on a point of the hovered border (a press there drags it), and the border being dragged by one: what it would be
  const [overVertex, setOverVertex] = useState(false)
  const [preview, setPreview] = useState<Board | null>(null)
  const vertex = useRef<{ id: number; index: number } | null>(null)
  // The point picked with the Point tool (it has the little remove button above it)
  const [picked, setPicked] = useState<{ id: number; index: number } | null>(null)
  const pending = useRef<Change | null>(null)
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
    vertex.current = null
    pending.current = null
    setPreview(null)
    corners.current = []
    pointer.current = null
    setLinearOpen(false)
    setDraft(null)
  }

  const scale = view?.scale ?? 1

  /** The point, whole, pulled onto the end of an open border when it is near one (the border tool only) */
  const magnet = (p: Point): Point => (forBorder.current && snapToEndpoint(p, board, SNAP_PX / scale)) || whole(p)

  /** A border that is not finished: it shows as the open line it is until it is let go */
  const borderDraft = (points: Point[]): StyledObject | null => {
    const pen = getBorderPen()
    // Thinned the way the finished border is (`thin` keeps what it kept as the stroke grows), so what shows now is what will be saved
    const thinned = pen.style.way === 'exact' ? thin(points, 1 / scale) : points
    return thinned.length
      ? ({
          id: 0,
          kind: 'line',
          layer: LAYER_MAIN,
          name: '',
          links: [],
          style: pen.style,
          points: thinned,
        } as LineObject)
      : null
  }

  /** The finished drawing for the border tool, snapped to what is near and merged into the areas it touches (Alt: not merged) */
  const finishBorder = (made: Omit<BorderObject, 'id'> | null, alt: boolean) => {
    if (!made) return
    const tolerance = SNAP_PX / scale
    // Corners of other borders pull first (so the two share the very same points), then the outlines of areas
    const pulled = made.points.map((p) => snapToVertex(p, board, tolerance) ?? p)
    const ringed = snapToBorders(pulled, board, tolerance)
    const snapped = {
      ...made,
      points: ringed.map((p, i) => whole(pulled[i] !== made.points[i] ? pulled[i] : p)),
    }
    if (alt) return onCreated([addObject(mapId, snapped)])
    const joined = joinOpenBorders(board, snapped)
    if (joined) {
      const added = changeObjects(mapId, joined)
      return onCreated(added.length > 0 ? added : joined.update!.map((u) => u.id))
    }
    const merged = mergeBorders(board, snapped, MERGE_PX / scale)
    const added = changeObjects(mapId, merged.change)
    // Merged into an area that was there: that area is what the drawing became
    if (added.length > 0) onCreated(added)
    else if (merged.id !== null) onCreated([merged.id])
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
        const f = {
          x: view.x + first.x * view.scale,
          y: view.y + first.y * view.scale,
        }
        if (Math.hypot(f.x - at.x, f.y - at.y) <= CLOSE_PX) {
          finishLinear(keys.alt, true)
          return false
        }
      }
      const corner = magnet(start)
      corners.current = [...corners.current, corner]
      pointer.current = corner
      setLinearOpen(true)
      linearDraft()
      return false
    }
    if (pen.shape) {
      shapeDrag.current = { from: start, to: start }
      return true
    }
    stroke.current = [magnet(start)]
    if (forBorder.current) setDraft(borderDraft(stroke.current))
    else if (isPlain(pen.style)) drawSegment(start, { x: start.x + 0.01, y: start.y })
    else
      setDraft({
        id: 0,
        ...drawLine(stroke.current, pen.style, scale),
      } as StyledObject)
    return true
  }

  /** A press on a point of the hovered border picks it up to move it. True when it did (the pointer then holds it) */
  const beginVertex = (at: Point): boolean => {
    if (!view || linearOpen || hovered === null) return false
    const border = board.objects.find((o) => o.id === hovered)
    if (border?.kind !== 'border' && border?.kind !== 'line') return false
    const ref = hitPathPoint(border, screenToBoard(view, at), HIT_PX / scale, null)
    if (ref?.kind !== 'point') return false
    vertex.current = { id: border.id, index: ref.index }
    setPicked(vertex.current)
    return true
  }

  /** The pointer moved while it holds a stroke or a shape */
  const move = (at: Point, keys: Keys) => {
    if (!view) return
    if (vertex.current) {
      const { id, index } = vertex.current
      const border = board.objects.find((o) => o.id === id)
      if (border?.kind !== 'border' && border?.kind !== 'line') return
      // It lands on a corner of another border when near one (its own corner it left does not count)
      const others = {
        ...board,
        objects: board.objects.filter((o) => o.id !== id),
      }
      const p = clampToBoard(screenToBoard(view, at))
      const to = snapToVertex(p, others, SNAP_PX / scale) ?? p
      pending.current = {
        update: [{ id, patch: movePoint(border, index, to) }],
      }
      return setPreview(applyChange(board, pending.current).board)
    }
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
    const to = magnet(p)
    stroke.current.push(to)
    if (forBorder.current) setDraft(borderDraft(stroke.current))
    else if (isPlain(getPen().style)) drawSegment(from, to)
    else
      setDraft({
        id: 0,
        ...drawLine(stroke.current, getPen().style, scale),
      } as StyledObject)
  }

  /** The pointer moved over the board with nothing held: a linear border's next edge follows it */
  const hover = (at: Point, toolId: 'line' | 'border') => {
    if (!view) return
    if (toolId === 'border' && corners.current.length > 0) {
      if (hovered !== null) setHovered(null)
      pointer.current = magnet(clampToBoard(screenToBoard(view, at)))
      return linearDraft()
    }
    const top = hitTestPart(board, screenToBoard(view, at), HIT_PX / scale)
    const own = top?.object.kind === toolId ? top : null
    const id = own?.object.id ?? null
    const edge = own?.part === 'edge'
    if (id !== hovered) setHovered(id)
    if (edge !== onEdge) setOnEdge(edge)
    const border = own?.object
    const over = !!border && (border.kind === 'border' || border.kind === 'line') && hitPathPoint(border, screenToBoard(view, at), HIT_PX / scale, null)?.kind === 'point'
    if (over !== overVertex) setOverVertex(over)
  }

  /** The hold ended: the drawing is made (a drag that made nothing makes nothing) */
  const end = (keys: Keys) => {
    if (vertex.current) {
      if (pending.current) changeObjects(mapId, pending.current)
      vertex.current = null
      pending.current = null
      setPreview(null)
      return repaint()
    }
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

  /** A double-click closes a linear border. True when it did */
  const doubleClick = (alt: boolean): boolean => {
    if (corners.current.length < 2) return false
    finishLinear(alt, false)
    return true
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

  return {
    draft,
    linearOpen,
    hovered,
    onEdge,
    overVertex,
    picked,
    setPicked,
    preview,
    beginVertex,
    begin,
    move,
    hover,
    end,
    cancel,
    doubleClick,
    handleKey,
  }
}
