// The Mouse tool: select, move, marquee, resize (which turns too), split and erase. A small state machine over the pure geometry
// (hit.ts, operations.ts, split.ts, erase.ts). A gesture previews on a copy of the board (applyChange) and commits once
// when the pointer lifts (changeObjects), so it is one undo step. Moves are followed on `window`, so a gesture that starts
// on a box button keeps going wherever the pointer is.
import { useEffect, useMemo, useRef, useState } from 'react'
import { unionBounds, rectFrom, type Rect } from './bounds'
import { applyChange, type Change } from './changes'
import { changeObjects } from './boardStore'
import { densify, eraseObject } from './erase'
import { hitTestPart, objectsInRect } from './hit'
import { findJunction, joinLines, type Junction } from './join'
import { hitPathPoint, moveHandle, movePoint } from './pathEdit'
import { duplicate, flip as flipObjects, moveBy, remove, resizeAndTurn, resizeTo } from './operations'
import { clearSelection, getSelection, select, toggleSelected, useSelection } from './selection'
import { splitBorder, splitLine, splitOpenBorder } from './split'
import type { Board, BoardObject, BorderObject, LineObject, Point } from './types'
import { screenToBoard, type Viewport } from './viewport'

/** How close (screen px) the pointer must be to a thin line to pick it */
export const HIT_PX = 6
/** The eraser circle's radius (screen px) */
export const ERASER_PX = 12
/** How long (ms) the pointer rests on an unnamed area before it offers to name it */
const AREA_PROMPT_MS = 500
/** How far (screen px) the pointer travels before a press becomes a drag */
const DRAG_PX = 3

export type Mode = 'select' | 'split' | 'erase'

type Gesture =
  | { type: 'press'; id: number | null; start: Point; startBoard: Point; wasSelected: boolean; base: number[] }
  | { type: 'move'; startBoard: Point; snapshot: BoardObject[] }
  | { type: 'marquee'; startBoard: Point; base: number[] }
  | { type: 'resize'; start: Rect; snapshot: BoardObject[] }
  | { type: 'erase'; centres: Point[]; snapshot: (LineObject | BorderObject)[] }
  | { type: 'vertex'; index: number; line: LineObject | BorderObject; startBoard: Point }
  | { type: 'handle'; index: number; side: 'in' | 'out'; line: LineObject | BorderObject; alt: boolean }

type Pointer = { clientX: number; clientY: number; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }

const merge = (changes: Change[]): Change => ({
  update: changes.flatMap((c) => c.update ?? []),
  remove: changes.flatMap((c) => c.remove ?? []),
  add: changes.flatMap((c) => c.add ?? []),
})

type Props = {
  mapId: string
  board: Board
  view: Viewport | null
  /** Client coordinates → the editor's own pixels */
  toLocal: (clientX: number, clientY: number) => Point
}

export function useMouseTool({ mapId, board, view, toLocal }: Props) {
  const selection = useSelection(mapId)
  // The point of the selected line whose curve knobs show (the id guards against a selection that has changed since)
  const [activeState, setActive] = useState<{ id: number; index: number } | null>(null)
  const selected = useMemo(() => board.objects.filter((o) => selection.has(o.id)), [board, selection])
  // The one selected line whose points can be edited (a pencil line has none to show: its way is exact)
  const editable = selected.length === 1 && (selected[0].kind === 'line' || selected[0].kind === 'border') && selected[0].style.way !== 'exact' ? selected[0] : null
  const activePoint = editable && activeState?.id === editable.id && activeState.index < editable.points.length ? activeState.index : null
  const [mode, setModeState] = useState<Mode>('select')
  const [preview, setPreview] = useState<Board | null>(null)
  const [marquee, setMarquee] = useState<Rect | null>(null)
  const [cursorAt, setCursorAt] = useState<Point | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [junction, setJunction] = useState<Junction | null>(null)
  const [overPoint, setOverPoint] = useState(false)
  // The area without a name the pointer has rested on (for the little "name this area" input), and where
  const [areaPrompt, setAreaPrompt] = useState<{ id: number; at: Point } | null>(null)
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptLocked = useRef(false)
  const nameless = useRef<number | null>(null)

  const gesture = useRef<Gesture | null>(null)
  const pending = useRef<Change | null>(null)
  const stopListening = useRef<(() => void) | null>(null)
  // What the handlers (which live on `window` for a while) need, always the latest
  const latest = useRef({ mapId, board, view, selected, mode, toLocal, editable, activePoint })
  useEffect(() => {
    latest.current = { mapId, board, view, selected, mode, toLocal, editable, activePoint }
  })
  useEffect(
    () => () => {
      stopListening.current?.()
      if (promptTimer.current) clearTimeout(promptTimer.current)
    },
    [],
  )

  /** The area under the pointer has no name (or null): after resting on it a moment, offer to name it */
  const watchNameless = (id: number | null, at: Point) => {
    if (id === nameless.current) return
    nameless.current = id
    if (promptTimer.current) clearTimeout(promptTimer.current)
    promptTimer.current = null
    if (!promptLocked.current) setAreaPrompt(null)
    if (id !== null) promptTimer.current = setTimeout(() => setAreaPrompt({ id, at }), AREA_PROMPT_MS)
  }

  const setMode = (next: Mode) => {
    latest.current.mode = next
    setModeState(next)
    if (next !== 'erase') setCursorAt(null)
  }

  const boardPoint = (e: { clientX: number; clientY: number }) => {
    const { view, toLocal } = latest.current
    return screenToBoard(view!, toLocal(e.clientX, e.clientY))
  }

  const show = (change: Change) => {
    pending.current = change
    setPreview(applyChange(latest.current.board, change).board)
  }

  const end = () => {
    gesture.current = null
    pending.current = null
    stopListening.current?.()
    stopListening.current = null
    setPreview(null)
    setMarquee(null)
  }

  const onMove = (e: PointerEvent) => {
    const g = gesture.current
    const { view, board, toLocal } = latest.current
    if (!g || !view) return
    const local = toLocal(e.clientX, e.clientY)
    const p = screenToBoard(view, local)
    if (latest.current.mode === 'erase') setCursorAt(local)

    if (g.type === 'press') {
      if (Math.hypot(local.x - g.start.x, local.y - g.start.y) < DRAG_PX) return
      if (g.id !== null) gesture.current = { type: 'move', startBoard: g.startBoard, snapshot: latest.current.selected }
      else gesture.current = { type: 'marquee', startBoard: g.startBoard, base: g.base }
      return onMove(e)
    }
    if (g.type === 'vertex') {
      const at = g.line.points[g.index]
      show({ update: [{ id: g.line.id, patch: movePoint(g.line, g.index, { x: at.x + p.x - g.startBoard.x, y: at.y + p.y - g.startBoard.y }) }] })
    } else if (g.type === 'handle') show({ update: [{ id: g.line.id, patch: moveHandle(g.line, g.index, g.side, p, !e.altKey) }] })
    else if (g.type === 'move') show(moveBy(g.snapshot, p.x - g.startBoard.x, p.y - g.startBoard.y))
    else if (g.type === 'marquee') {
      const rect = rectFrom(g.startBoard, p)
      setMarquee(rect)
      select(latest.current.mapId, [...g.base, ...objectsInRect(board, rect).map((o) => o.id)])
    } else if (g.type === 'resize') {
      // Dragging the handle sizes and turns about the opposite corner; Alt sizes to any ratio without turning
      show(e.altKey ? resizeTo(g.snapshot, g.start, p, false) : resizeAndTurn(g.snapshot, g.start, p, e.shiftKey))
    } else if (g.type === 'erase') {
      const radius = ERASER_PX / view.scale
      const last = g.centres[g.centres.length - 1]
      g.centres.push(...densify([last, p], radius / 2).slice(1))
      show(merge(g.snapshot.map((line) => eraseObject(line, g.centres, radius))))
    }
  }

  const onUp = () => {
    const g = gesture.current
    const change = pending.current
    const { mapId, selected } = latest.current
    if (g?.type === 'press' && g.id !== null && g.wasSelected && getSelection(mapId).size > 1) select(mapId, [g.id])
    if (change && g) {
      const added = changeObjects(mapId, change)
      if (g.type === 'erase') {
        const gone = new Set(change.remove ?? [])
        select(mapId, [...selected.map((o) => o.id).filter((id) => !gone.has(id)), ...added])
      }
    }
    end()
  }

  const listen = () => {
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    stopListening.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }

  const splitAt = (target: LineObject | BorderObject, p: Point) => {
    const { mapId } = latest.current
    if (target.kind === 'border' && !target.open) {
      // An area opens into a line starting and ending at the cut
      const opened = splitBorder(target, p)
      if (opened) select(mapId, changeObjects(mapId, { remove: [target.id], add: [opened] }))
      return
    }
    // An open border splits like a line (its pieces are open borders)
    const halves = target.kind === 'border' ? splitOpenBorder(target, p) : splitLine(target, p)
    if (!halves) return
    select(mapId, changeObjects(mapId, { remove: [target.id], add: halves }))
  }

  /** A press on the board with the Mouse tool (left button) */
  const begin = (e: Pointer) => {
    const { board, view, mode, selected, mapId } = latest.current
    if (!view || gesture.current) return
    const p = boardPoint(e)
    const found = hitTestPart(board, p, HIT_PX / view.scale)
    const hit = found?.object ?? null
    if (mode === 'split') {
      if (hit?.kind === 'line' || hit?.kind === 'border') {
        splitAt(hit, p)
        setMode('select')
      }
      return
    }
    if (mode === 'erase') {
      const lines = selected.filter((o): o is LineObject | BorderObject => o.kind === 'line' || o.kind === 'border')
      if (lines.length === 0) return
      gesture.current = { type: 'erase', centres: [p], snapshot: lines }
      setCursorAt(latest.current.toLocal(e.clientX, e.clientY))
      show(merge(lines.map((line) => eraseObject(line, [p], ERASER_PX / view.scale))))
      return listen()
    }
    // Where two lines touch: a click joins them
    const joint = findJunction(board, p, HIT_PX / view.scale)
    if (joint) {
      const { change, id } = joinLines(joint)
      changeObjects(mapId, change)
      select(mapId, [id])
      setJunction(null)
      return
    }
    // A point or knob of the line being edited
    const { editable, activePoint } = latest.current
    const ref = editable && hitPathPoint(editable, p, HIT_PX / view.scale, activePoint)
    if (editable && ref) {
      setActive({ id: editable.id, index: ref.index })
      gesture.current = ref.kind === 'point' ? { type: 'vertex', index: ref.index, line: editable, startBoard: p } : { type: 'handle', index: ref.index, side: ref.kind, line: editable, alt: false }
      return listen()
    }
    const additive = e.shiftKey || e.ctrlKey || e.metaKey
    if (found && hit) {
      if (additive) return toggleSelected(mapId, hit.id)
      const wasSelected = getSelection(mapId).has(hit.id)
      if (!wasSelected) select(mapId, [hit.id])
      latest.current.selected = board.objects.filter((o) => getSelection(mapId).has(o.id))
      // A drag that starts inside an area that was not selected selects a rectangle instead of moving it, so areas never
      // block selecting what is under them; a drag from its edge, or from a selected area, moves it
      const marqueeInstead = found.part === 'inside' && !wasSelected
      gesture.current = { type: 'press', id: marqueeInstead ? null : hit.id, start: latest.current.toLocal(e.clientX, e.clientY), startBoard: p, wasSelected, base: [] }
    } else {
      const base = additive ? [...getSelection(mapId)] : []
      if (!additive) clearSelection(mapId)
      gesture.current = { type: 'press', id: null, start: latest.current.toLocal(e.clientX, e.clientY), startBoard: p, wasSelected: false, base }
    }
    listen()
  }

  /** The pointer over the board with no gesture: which cursor to show */
  const hover = (e: { clientX: number; clientY: number }) => {
    const { board, view, mode, toLocal } = latest.current
    if (!view || gesture.current) return
    if (mode === 'erase') return setCursorAt(toLocal(e.clientX, e.clientY))
    if (mode !== 'select') return
    const p = boardPoint(e)
    const tolerance = HIT_PX / view.scale
    const top = hitTestPart(board, p, tolerance)
    setHovered(top?.object.id ?? null)
    watchNameless(top?.object.kind === 'border' && !top.object.open && top.object.name === '' ? top.object.id : null, toLocal(e.clientX, e.clientY))
    setJunction(findJunction(board, p, tolerance))
    const { editable, activePoint } = latest.current
    setOverPoint(!!editable && !!hitPathPoint(editable, p, tolerance, activePoint))
  }

  /** A double-click on a line cuts it there */
  const doubleClick = (e: { clientX: number; clientY: number }) => {
    const { board, view } = latest.current
    if (!view) return
    const p = boardPoint(e)
    const hit = hitTestPart(board, p, HIT_PX / view.scale)?.object
    if (hit?.kind === 'line') splitAt(hit, p)
  }

  /** The box's resize handle was pressed */
  const beginResize = () => {
    const start = unionBounds(latest.current.selected)
    if (!start || gesture.current) return
    gesture.current = { type: 'resize', start, snapshot: latest.current.selected }
    listen()
  }

  const cancel = () => {
    end()
    setMode('select')
  }

  const ids = () => latest.current.selected.map((o) => o.id)
  return {
    selected,
    mode,
    setMode,
    preview,
    marquee,
    cursorAt,
    areaPrompt,
    /** The name input is being used: keep it even when the pointer leaves the area */
    lockPrompt: (on: boolean) => {
      promptLocked.current = on
    },
    closePrompt: () => {
      promptLocked.current = false
      nameless.current = null
      setAreaPrompt(null)
    },
    over: hovered !== null || junction !== null,
    hovered,
    junction,
    overPoint,
    activePoint,
    editable,
    begin,
    hover,
    doubleClick,
    beginResize,
    cancel,
    flip: (axis: 'h' | 'v') => void changeObjects(mapId, flipObjects(latest.current.selected, axis)),
    duplicateSelected: () => select(mapId, changeObjects(mapId, duplicate(latest.current.selected))),
    removeSelected: () => {
      changeObjects(mapId, remove(ids()))
      clearSelection(mapId)
    },
    selectAll: () => select(mapId, latest.current.board.objects.filter((o) => o.layer !== 0).map((o) => o.id)),
  }
}
