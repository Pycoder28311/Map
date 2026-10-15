import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { changeObjects, canRedo, canUndo, redo, undo, useBoard } from './boardStore'
import { applyChange } from './changes'
import { LuGalleryHorizontal } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import Presenter from './presenter/Presenter'
import { FLOAT } from './floating'
import { hitTest } from './hit'
import { newPoint } from './drawPoint'
import { getPointPen } from './pen'
import PointPenPanel from './PointPenPanel'
import VisitorLayer from './VisitorLayer'
import { setPageInset } from '../../lib/pageInset'
import { SIDE_PANEL_PX } from './floating'
import AreaNameInput from './AreaNameInput'
import { nameArea } from './areaName'
import BorderPenPanel from './BorderPenPanel'
import PenPanel from './PenPanel'
import { boundsOf, unionBounds } from './bounds'
import { getLinkPick, startLinkPick, stopLinkPick } from '../links/linkPick'
import { paintBoard } from './render'
import { toolOfKey, type ToolId } from './tools'
import type { BoardObject, Point } from './types'
import { boardToScreen, insideBoard, screenToBoard, zoomFactorOf, type Size } from './viewport'
import LinkPickBar from './LinkPickBar'
import MapTitleBar from './MapTitleBar'
import { clearSelection, select, useSelection } from './selection'
import { buttonsFor, type BoxAction } from './selectionButtons'
import PathEditor from './PathEditor'
import SelectionBox from './SelectionBox'
import SelectionPanel, { type StylePreview } from './SelectionPanel'
import ToolPanel from './ToolPanel'
import { finishEditing } from './activeEditor'
import Notice from './Notice'
import { rectFrom } from './bounds'
import { textAt } from './drawText'
import TextEditorOverlay from './TextEditorOverlay'
import TextPenPanel from './TextPenPanel'
import { useDrawTool } from './useDrawTool'
import { useTextTool } from './useTextTool'
import { ERASER_PX, HIT_PX, useMouseTool } from './useMouseTool'
import { useViewport } from './useViewport'
import ZoomControls from './ZoomControls'

const KEY_ZOOM = 1.25

type Mode = 'none' | 'draw' | 'pan' | 'pinch'

const isTyping = (target: EventTarget) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const asPath = (o: BoardObject | undefined) => (o?.kind === 'line' || o?.kind === 'border' ? o : null)
/** A hovered line or area that is not the one being edited and has points to show (its way is not exact) */
const hoveredPath = (o: BoardObject | undefined, editing: number | undefined) =>
  (o?.kind === 'line' || o?.kind === 'border') && o.id !== editing && o.style.way !== 'exact' ? o : null

/** The rubber band while drag-selecting */
function Marquee({
  rect,
  view,
}: {
  rect: { x: number; y: number; w: number; h: number }
  view: NonNullable<ReturnType<typeof useViewport>['view']>
}) {
  const a = boardToScreen(view, { x: rect.x, y: rect.y })
  return (
    <span
      aria-hidden
      style={{
        left: a.x,
        top: a.y,
        width: rect.w * view.scale,
        height: rect.h * view.scale,
      }}
      className="pointer-events-none absolute border border-accent bg-accent/10"
    />
  )
}

/**
 * A map's editor: the board on a canvas that fills the page, with pan and zoom, the tool panel, the name bar
 * and the zoom control floating over it. The Line tool is the pencil; the Mouse tool selects (features/board/useMouseTool);
 * Space or the middle button pans.
 */
export default function BoardEditor({ mapId }: { mapId: string }) {
  const board = useBoard(mapId)
  const root = useRef<HTMLDivElement>(null)
  const outer = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState<Size | null>(null)
  // The size the canvas was last painted for (its CSS size follows it, never the page's)
  const [painted, setPainted] = useState<Size | null>(null)
  const [tool, setTool] = useState<ToolId>('line')
  const [space, setSpace] = useState(false)
  const [mode, setModeState] = useState<Mode>('none')
  // Bumped to repaint when something was drawn on the canvas that is not in the board (a cancelled stroke)
  const [repaint, setRepaint] = useState(0)
  // The editor's whole width, whatever the sidebar takes: the untouched view is fitted to it, so the board stays where it is
  const [fullSize, setFullSize] = useState<Size | null>(null)
  const { view, zoom, pan, fit, actualSize, focusOn } = useViewport(mapId, size, fullSize)
  const selection = useSelection(mapId)
  const mouse = useMouseTool({
    mapId,
    board,
    view,
    toLocal: (x, y) => {
      const box = root.current!.getBoundingClientRect()
      return { x: x - box.left, y: y - box.top }
    },
  })
  // What is painted: the board, or while a gesture runs, the board as it would be
  // What the Line and Border tools are drawing right now (not in the board until the drawing is finished)
  const draw = useDrawTool({ mapId, board, view, canvas, repaint: () => setRepaint((n) => n + 1) })
  const text = useTextTool({ mapId, board, view })
  // The visitor's view: no tools, a click on a pin opens its card
  const [visitor] = useState(false)
  const [presenting, setPresenting] = useState(false)
  // The pointer is over the grey around the board's sheet (a drag there pans)
  const [offBoard, setOffBoard] = useState(false)
  const [openPin, setOpenPin] = useState<{ id: number; full: boolean } | null>(null)
  // A click with the Point tool is a pin only if it did not move (a drag pans the board)
  const pinStart = useRef<Point | null>(null)
  // The same for a press on bare board with the Mouse tool
  const emptyStart = useRef<Point | null>(null)
  const [stylePreview, setStylePreview] = useState<StylePreview | null>(null)
  const shown = useMemo(() => {
    const base = mouse.preview ?? board
    return stylePreview
      ? applyChange(base, {
          update: [{ id: stylePreview.id, patch: stylePreview.patch }],
        }).board
      : base
  }, [mouse.preview, board, stylePreview])
  const boxObjects = shown.objects.filter((o) => selection.has(o.id))
  const boxBounds = unionBounds(boxObjects)

  const modeRef = useRef<Mode>('none')
  const setMode = (m: Mode) => {
    modeRef.current = m
    setModeState(m)
  }
  const pointers = useRef(new Map<number, Point>())

  // The page's size
  useEffect(() => {
    const el = root.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const whole = outer.current
    const measureWhole = () => whole && setFullSize({ w: whole.clientWidth, h: whole.clientHeight })
    measureWhole()
    const observer = new ResizeObserver(() => {
      measure()
      measureWhole()
    })
    observer.observe(el)
    if (whole) observer.observe(whole)
    return () => observer.disconnect()
  }, [])

  // Paint (at most once a frame)
  useEffect(() => {
    const el = canvas.current
    const ctx = el?.getContext('2d')
    if (!el || !ctx || !size || !view) return
    const dpr = window.devicePixelRatio || 1
    const frame = requestAnimationFrame(() => {
      el.width = Math.round(size.w * dpr)
      el.height = Math.round(size.h * dpr)
      paintBoard(ctx, shown, view, size, dpr, draw.draft ? [draw.draft] : [], tool === 'mouse' ? mouse.hovered : null, text.editing?.id ?? null)
      setPainted((p) => (p && p.w === size.w && p.h === size.h ? p : size))
    })
    return () => cancelAnimationFrame(frame)
  }, [shown, view, size, repaint, draw.draft, tool, mouse.hovered, text.editing?.id])

  // The wheel zooms toward the pointer (not passive: it must stop the page scrolling)
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (modeRef.current !== 'none') return
      const box = el.getBoundingClientRect()
      zoom(zoomFactorOf(e), {
        x: e.clientX - box.left,
        y: e.clientY - box.top,
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const pointOf = (e: PointerEvent<HTMLCanvasElement>): Point => {
    const box = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  const onDown = (e: PointerEvent<HTMLCanvasElement>) => {
    // A click on the map ends the text being typed (it may have lost the focus to the sidebar already)
    finishEditing()
    root.current?.focus()
    const at = pointOf(e)
    if (visitor && view && e.button === 0 && pointers.current.size === 0) {
      const found = hitTest(board, screenToBoard(view, at), HIT_PX / view.scale)
      setOpenPin(found?.kind === 'point' ? { id: found.id, full: false } : null)
    }
    pointers.current.set(e.pointerId, at)
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size === 2) {
      // A second finger: pinch, and a stroke that had begun is dropped
      draw.cancel()
      mouse.cancel()
      return setMode('pinch')
    }
    if (modeRef.current !== 'none' || !view) return
    if (e.button === 1 || (e.button === 0 && space)) {
      e.preventDefault()
      return setMode('pan')
    }
    // Off the board's sheet, a drag moves the whole view, whatever the tool
    if (e.button === 0 && !insideBoard(screenToBoard(view, at))) return setMode('pan')
    if (visitor) return e.button === 0 ? (pinStart.current = at, undefined) : undefined
    if (e.button === 0 && tool === 'point') {
      const found = hitTest(board, screenToBoard(view, at), HIT_PX / view.scale)
      if (found?.kind === 'point') {
        // An existing pin is picked, not covered: the Mouse tool takes over
        pickTool('mouse')
        return mouse.begin(e)
      }
      pinStart.current = at
      return
    }
    if (e.button === 0 && tool === 'mouse') {
      // A drag on bare board moves the view (Shift or Ctrl drags a selection rectangle); a click on it clears the selection
      const plain = !e.shiftKey && !e.ctrlKey && !e.metaKey
      const bare = plain && mouse.mode === 'select' && !mouse.overPoint && !mouse.junction && !hitTest(board, screenToBoard(view, at), HIT_PX / view.scale)
      if (bare) {
        emptyStart.current = at
        return
      }
      return mouse.begin(e)
    }
    if (e.button === 0 && tool === 'text') {
      if (text.begin(at)) setMode('draw')
      return
    }
    if (e.button === 0 && (tool === 'line' || tool === 'border')) {
      if (draw.begin(at, tool, { shift: e.shiftKey, alt: e.altKey })) setMode('draw')
    }
  }

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const before = pointers.current.get(e.pointerId)
    if (view && modeRef.current === 'none') setOffBoard(!insideBoard(screenToBoard(view, pointOf(e))))
    if (!visitor && tool === 'mouse' && modeRef.current === 'none') mouse.hover(e)
    if (tool === 'border' && modeRef.current === 'none') draw.hover(pointOf(e))
    if (!before) return
    const at = pointOf(e)
    pointers.current.set(e.pointerId, at)
    const start = pinStart.current ?? emptyStart.current
    if (start && modeRef.current === 'none') {
      if (Math.hypot(at.x - start.x, at.y - start.y) < 4) return
      pinStart.current = null
      emptyStart.current = null
      setMode('pan')
      return
    }
    if (modeRef.current === 'pinch' && pointers.current.size === 2) {
      // The other finger stays; this one moved: zoom by the change of distance, pan by the middle's move
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)![1]
      const was = Math.hypot(before.x - other.x, before.y - other.y)
      const now = Math.hypot(at.x - other.x, at.y - other.y)
      pan((at.x - before.x) / 2, (at.y - before.y) / 2)
      if (was > 0 && now > 0) zoom(now / was, { x: (at.x + other.x) / 2, y: (at.y + other.y) / 2 })
    } else if (modeRef.current === 'pan') {
      pan(at.x - before.x, at.y - before.y)
    } else if (modeRef.current === 'draw') {
      if (tool === 'text') text.move(at)
      else draw.move(at, { shift: e.shiftKey, alt: e.altKey })
    }
  }

  const onUp = (e: PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId)
    const start = pinStart.current
    pinStart.current = null
    if (emptyStart.current && e.type === 'pointerup' && modeRef.current === 'none') clearSelection(mapId)
    emptyStart.current = null
    if (start && !visitor && view && modeRef.current === 'none' && e.type === 'pointerup') {
      changeObjects(mapId, { add: [newPoint(screenToBoard(view, start), getPointPen())] })
    }
    if (modeRef.current === 'draw') {
      if (tool === 'text') text.end()
      else draw.end({ shift: e.shiftKey, alt: e.altKey })
    }
    // A pinch ends with its first finger up; the other one does nothing until pressed again
    if (pointers.current.size < 2) setMode('none')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (isTyping(e.target) || e.altKey) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    // A visitor can only look: zoom and move
    if (visitor && !['+', '=', '-', '0', '1', ' ', 'escape'].includes(key)) return
    if (tool === 'border' && draw.handleKey(key, e.altKey)) return e.preventDefault()
    if (mod) {
      if (key === 'd' && mouse.selected.length > 0) {
        e.preventDefault()
        mouse.duplicateSelected()
      } else if (key === 'a') {
        e.preventDefault()
        mouse.selectAll()
      } else if (key === 'z') {
        e.preventDefault()
        if (e.shiftKey ? canRedo(mapId) : canUndo(mapId)) (e.shiftKey ? redo : undo)(mapId)
      } else if (key === 'y') {
        e.preventDefault()
        redo(mapId)
      }
      return
    }
    if (key === 'enter' && tool === 'mouse' && mouse.selected.length === 1 && mouse.selected[0].kind === 'text') {
      e.preventDefault()
      return text.edit(mouse.selected[0])
    }
    if (key === 'escape' && presenting) setPresenting(false)
    else if (key === 'escape' && visitor) setOpenPin(null)
    else if (key === 'escape' && tool === 'point') pickTool('mouse')
    else if (key === 'escape') {
      if (mouse.mode !== 'select') mouse.cancel()
      else if (getLinkPick()) stopLinkPick()
      else clearSelection(mapId)
    } else if ((key === 'delete' || key === 'backspace') && mouse.selected.length > 0) {
      e.preventDefault()
      mouse.removeSelected()
    } else if (key === ' ') {
      e.preventDefault()
      setSpace(true)
    } else if (key === '+' || key === '=') zoom(KEY_ZOOM)
    else if (key === '-') zoom(1 / KEY_ZOOM)
    else if (key === '0') fit()
    else if (key === '1') actualSize()
    else {
      const picked = toolOfKey(key)
      if (picked) pickTool(picked.id)
    }
  }

  const pickTool = (next: ToolId) => {
    finishEditing()
    draw.cancel()
    setTool(next)
    setStylePreview(null)
    mouse.setMode('select')
  }

  /** Double-click with the Mouse tool: a text is edited in place, anything else is the tool's own (cut a line) */
  const onMouseDoubleClick = (e: { clientX: number; clientY: number }) => {
    if (view) {
      const box = root.current!.getBoundingClientRect()
      const hit = textAt(board, screenToBoard(view, { x: e.clientX - box.left, y: e.clientY - box.top }), HIT_PX / view.scale)
      if (hit) {
        select(mapId, [hit.id])
        return text.edit(hit)
      }
    }
    mouse.doubleClick(e)
  }

  const onBoxAction = (action: BoxAction) => {
    const one = mouse.selected.length === 1 ? mouse.selected[0] : null
    if (action === 'flipH') mouse.flip('h')
    else if (action === 'flipV') mouse.flip('v')
    else if (action === 'duplicate') mouse.duplicateSelected()
    else if (action === 'remove') mouse.removeSelected()
    else if (action === 'split') mouse.setMode(mouse.mode === 'split' ? 'select' : 'split')
    else if (action === 'description') document.getElementById('area-description')?.focus()
    else if (action === 'link' && one) startLinkPick({ mapId, objectId: one.id })
  }
  const focusSelected = () => boxBounds && focusOn(boxBounds)
  const onlyPaths = mouse.selected.length > 0 && mouse.selected.every((o) => o.kind === 'line' || o.kind === 'border')
  const showBox = !visitor && tool === 'mouse' && boxBounds && view && !text.editing

  const cursor =
    mode === 'pan'
      ? 'cursor-grabbing'
      : space || offBoard
        ? 'cursor-grab'
        : tool === 'line' || tool === 'border' || tool === 'point' || mouse.mode === 'split'
          ? 'cursor-crosshair'
          : mouse.mode === 'erase'
            ? 'cursor-none'
            : mouse.overPoint
              ? 'cursor-move'
              : mouse.over
                ? 'cursor-pointer'
                : ''

  // The sidebar on the right: the options of the Line tool, or of what is selected
  const sidebar = visitor ? null : tool === 'line' || tool === 'border' || tool === 'text' || tool === 'point' ? 'pen' : tool === 'mouse' && mouse.selected.length > 0 ? 'selection' : null
  useEffect(() => {
    setPageInset(sidebar ? SIDE_PANEL_PX : 0)
    return () => setPageInset(0)
  }, [sidebar])

  return (
    <div ref={outer} className="flex h-full min-h-48 overflow-hidden">
      <div
        ref={root}
        tabIndex={0}
        aria-label="Map editor"
        onKeyDown={onKeyDown}
        onKeyUp={(e) => e.key === ' ' && setSpace(false)}
        onBlur={() => setSpace(false)}
        className="relative min-w-0 flex-1 overflow-hidden bg-fill outline-none"
      >
        <canvas
          ref={canvas}
          aria-label="Board"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={(e) => (visitor ? undefined : tool === 'mouse' ? onMouseDoubleClick(e) : tool === 'border' && draw.doubleClick(e.altKey))}
          // Its CSS size is the size it was painted for, not the page's: when the page changes size (the sidebar) the old picture stays as it
          // was, cut off, for the frames until the new one is painted, instead of being squeezed to the new box
          style={painted ? { width: painted.w, height: painted.h } : undefined}
          className={`absolute start-0 top-0 touch-none ${painted ? '' : 'size-full'} ${cursor}`}
        />
        {mouse.marquee && view && <Marquee rect={mouse.marquee} view={view} />}
        {mouse.mode === 'erase' && mouse.cursorAt && (
          <span
            aria-hidden
            style={{
              left: mouse.cursorAt.x - ERASER_PX,
              top: mouse.cursorAt.y - ERASER_PX,
              width: 2 * ERASER_PX,
              height: 2 * ERASER_PX,
            }}
            className="pointer-events-none absolute rounded-full border-2 border-fg/70 bg-fg/10"
          />
        )}
        {showBox && (
          <SelectionBox
            bounds={boxBounds}
            view={view}
            buttons={buttonsFor(boxObjects)}
            splitting={mouse.mode === 'split'}
            disabled={onlyPaths ? [] : ['split']}
            onAction={onBoxAction}
            onHandle={(action, e) => (action === 'resize' ? mouse.beginResize() : mouse.beginRotate(e))}
          />
        )}
        {tool === 'mouse' && view && (
          <PathEditor
            view={view}
            line={asPath(shown.objects.find((o) => o.id === mouse.editable?.id))}
            active={mouse.activePoint}
            hovered={hoveredPath(
              shown.objects.find((o) => o.id === mouse.hovered),
              mouse.editable?.id,
            )}
            junction={mouse.junction}
          />
        )}
        {tool === 'mouse' && mouse.areaPrompt && (
          <AreaNameInput
            key={mouse.areaPrompt.id}
            at={mouse.areaPrompt.at}
            onSave={(name) => changeObjects(mapId, nameArea(board, mouse.areaPrompt!.id, name))}
            onClose={mouse.closePrompt}
            onUse={mouse.lockPrompt}
          />
        )}
        <MapTitleBar mapId={mapId} />
        {!visitor && <ToolPanel mapId={mapId} tool={tool} onTool={pickTool} />}
        {text.editing && view && (
          <TextEditorOverlay key={text.editing.id ?? 'new'} text={text.editing.draft} view={view} onCommit={text.commit} onCancel={text.cancel} />
        )}
        {tool === 'text' && text.box && view && <Marquee rect={rectFrom(text.box.from, text.box.to)} view={view} />}
        {text.notice && <Notice text={text.notice} onDismiss={text.dismissNotice} />}
        <LinkPickBar mapId={mapId} board={board.objects} />
        {!visitor && !text.editing && (
          <Button variant="ghost" icon={LuGalleryHorizontal} onClick={() => setPresenting(true)} className={`absolute start-1/2 bottom-3 -translate-x-1/2 ${FLOAT}`}>
            Maps
          </Button>
        )}
        {presenting && <Presenter mapId={mapId} onClose={() => { setPresenting(false); root.current?.focus() }} />}
        {visitor && view && size && (
          <VisitorLayer
            board={board}
            view={view}
            size={size}
            openId={openPin?.id ?? null}
            full={openPin?.full ?? false}
            onMore={() => setOpenPin((p) => p && { ...p, full: true })}
            onClose={() => setOpenPin(null)}
            onShowBoardObject={(id) => {
              const target = board.objects.find((o) => o.id === id)
              if (target) focusOn(boundsOf(target))
            }}
          />
        )}
        {view && <ZoomControls scale={view.scale} onZoom={(f) => zoom(f)} onFit={fit} />}
      </div>
      {!visitor && tool === 'mouse' && (
        <SelectionPanel
          mapId={mapId}
          selected={mouse.selected}
          board={board.objects}
          mode={mouse.mode}
          onSplit={() => mouse.setMode(mouse.mode === 'split' ? 'select' : 'split')}
          onFocus={focusSelected}
          onErase={() => mouse.setMode(mouse.mode === 'erase' ? 'select' : 'erase')}
          onDuplicate={mouse.duplicateSelected}
          onPreview={setStylePreview}
          onShowBoardObject={(id) => {
            select(mapId, [id])
            const target = board.objects.find((o) => o.id === id)
            if (target) focusOn(boundsOf(target))
          }}
        />
      )}
      {!visitor && tool === 'line' && <PenPanel />}
      {!visitor && tool === 'border' && <BorderPenPanel />}
      {!visitor && tool === 'text' && <TextPenPanel />}
      {!visitor && tool === 'point' && <PointPenPanel />}
    </div>
  )
}
