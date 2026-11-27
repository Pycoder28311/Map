import { useEffect, useRef, useState } from 'react'
import { boundsOf, flatten } from '../model/raster'
import { isShape } from '../model/types'
import { cancel, getState, selected, setView, subscribe, useStore, type View } from '../store/store'
import { editText, press, resizeSelected, type Gesture, type Mods } from './tools'
import { clampUnit, fitView, handleAt, handleHalf, handlePoint, HANDLES, nearestZoom, stepZoom, unitAt, zoomAt } from './view'

const CHECKER_A = '#3a3a40'
const CHECKER_B = '#2e2e33'
const GRID = 'rgba(255,255,255,0.08)'
const GRID_STRONG = 'rgba(255,255,255,0.18)'
const ACCENT = '#f0b429'
const MIRROR = '#4fc3f7'

/** The cursor of each tool */
const CURSOR: Record<string, string> = { select: 'default', text: 'text', eyedropper: 'copy' }

/**
 * The board: the drawing on a grid of units, zoomed in whole steps (every unit the same size on screen), with its grid lines, the mirror
 * lines and the selected object's frame and 8 handles. Space held (or the middle button): pan; Ctrl + wheel: zoom at the pointer; wheel:
 * scroll. Every press goes to the tool (board/tools.ts) as a unit of the board: nothing is drawn outside it
 */
export default function Board() {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const offscreen = useRef<HTMLCanvasElement | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const panning = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  // Touch: the fingers down, a pinch (two fingers: zoom and pan), and a one-finger press waiting to know it is not the start of a pinch
  const fingers = useRef(new Map<number, [number, number]>())
  const pinch = useRef<{ dist: number; mid: [number, number]; view: View } | null>(null)
  const pinchHeld = useRef(false)
  const waiting = useRef<{ at: [number, number]; mods: Mods } | null>(null)
  const [space, setSpace] = useState(false)
  const [hover, setHover] = useState<[number, number] | null>(null)
  const tool = useStore((s) => s.tool)

  // Fit the board when the app opens and when the board's size changes
  const size = useStore((s) => `${s.drawing.width}x${s.drawing.height}`)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const d = getState().drawing
    setView(fitView(d.width, d.height, el.clientWidth, el.clientHeight))
  }, [size])

  // Draw (on the next frame after any change)
  useEffect(() => {
    let frame = 0
    const draw = () => {
      frame = 0
      const el = canvas.current
      const box = wrap.current
      if (!el || !box) return
      const s = getState()
      const d = s.drawing
      const dpr = window.devicePixelRatio || 1
      const cw = box.clientWidth
      const ch = box.clientHeight
      if (el.width !== Math.round(cw * dpr) || el.height !== Math.round(ch * dpr)) {
        el.width = Math.round(cw * dpr)
        el.height = Math.round(ch * dpr)
        el.style.width = `${cw}px`
        el.style.height = `${ch}px`
      }
      const ctx = el.getContext('2d')!
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, el.width, el.height)
      // A unit in device pixels: a whole number, the same for every unit
      const u = Math.max(1, Math.round(s.view.zoom * dpr))
      const ox = Math.round(s.view.panX * dpr)
      const oy = Math.round(s.view.panY * dpr)
      const bw = d.width * u
      const bh = d.height * u
      // Transparency: a checkerboard (fixed squares on screen) under the board
      const sq = Math.max(4, Math.round(8 * dpr))
      ctx.save()
      ctx.beginPath()
      ctx.rect(ox, oy, bw, bh)
      ctx.clip()
      ctx.fillStyle = CHECKER_A
      ctx.fillRect(ox, oy, bw, bh)
      ctx.fillStyle = CHECKER_B
      for (let y = 0; y * sq < bh; y++) for (let x = (y % 2); x * sq < bw; x += 2) ctx.fillRect(ox + x * sq, oy + y * sq, sq, sq)
      // The drawing: one canvas pixel per unit, scaled up without smoothing
      const off = (offscreen.current ??= document.createElement('canvas'))
      if (off.width !== d.width || off.height !== d.height) {
        off.width = d.width
        off.height = d.height
      }
      const octx = off.getContext('2d')!
      const image = octx.createImageData(d.width, d.height)
      const cells = flatten(d)
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        if (!c) continue
        image.data[i * 4] = parseInt(c.slice(1, 3), 16)
        image.data[i * 4 + 1] = parseInt(c.slice(3, 5), 16)
        image.data[i * 4 + 2] = parseInt(c.slice(5, 7), 16)
        image.data[i * 4 + 3] = 255
      }
      octx.putImageData(image, 0, 0)
      ctx.drawImage(off, ox, oy, bw, bh)
      // Grid lines (from 4 CSS px per unit up); every 8th a little stronger
      if (s.settings.grid && s.view.zoom >= 4) {
        for (let x = 1; x < d.width; x++) {
          ctx.fillStyle = x % 8 === 0 ? GRID_STRONG : GRID
          ctx.fillRect(ox + x * u, oy, 1, bh)
        }
        for (let y = 1; y < d.height; y++) {
          ctx.fillStyle = y % 8 === 0 ? GRID_STRONG : GRID
          ctx.fillRect(ox, oy + y * u, bw, 1)
        }
      }
      ctx.restore()
      // The mirror lines, across the board's middle
      ctx.fillStyle = MIRROR
      const line = Math.max(1, Math.round(dpr))
      if (s.settings.mirror.x) ctx.fillRect(ox + Math.round((d.width * u) / 2) - Math.floor(line / 2), oy, line, bh)
      if (s.settings.mirror.y) ctx.fillRect(ox, oy + Math.round((d.height * u) / 2) - Math.floor(line / 2), bw, line)
      // The board's edge
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'
      ctx.lineWidth = line
      ctx.strokeRect(ox - line / 2, oy - line / 2, bw + line, bh + line)
      // The selection: its frame and its 8 handles
      const item = selected(s)
      if (item && isShape(item)) {
        const b = boundsOf(item)
        ctx.strokeStyle = ACCENT
        ctx.lineWidth = line
        ctx.setLineDash([4 * dpr, 3 * dpr])
        ctx.strokeRect(ox + b.x * u + line / 2, oy + b.y * u + line / 2, b.w * u - line, b.h * u - line)
        ctx.setLineDash([])
        for (const h of HANDLES) {
          const [hx, hy] = handlePoint(s.view, b, h)
          const r = handleHalf() * dpr
          ctx.fillStyle = '#111'
          ctx.fillRect(hx * dpr - r - line, hy * dpr - r - line, 2 * r + 2 * line, 2 * r + 2 * line)
          ctx.fillStyle = ACCENT
          ctx.fillRect(hx * dpr - r, hy * dpr - r, 2 * r, 2 * r)
        }
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    schedule()
    const unsubscribe = subscribe(schedule)
    const observer = new ResizeObserver(schedule)
    if (wrap.current) observer.observe(wrap.current)
    return () => {
      unsubscribe()
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  // Space held: pan with the pointer
  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !typing(e)) {
        e.preventDefault()
        setSpace(true)
      }
    }
    const up = (e: KeyboardEvent) => e.code === 'Space' && setSpace(false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Wheel: Ctrl / ⌘ zooms at the pointer, otherwise scrolls (not passive: it stops the page's own zoom)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const { view } = getState()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) setView(zoomAt(view, stepZoom(view.zoom, e.deltaY < 0 ? 1 : -1), e.clientX - r.left, e.clientY - r.top))
      else setView({ panX: Math.round(view.panX - e.deltaX), panY: Math.round(view.panY - e.deltaY) })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const local = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }
  const mods = (e: React.PointerEvent | PointerEvent): Mods => ({ shift: e.shiftKey || getState().settings.constrain, alt: e.altKey })
  const unit = (e: React.PointerEvent) => {
    const [px, py] = local(e)
    const { view, drawing } = getState()
    return clampUnit(unitAt(view, px, py), drawing.width, drawing.height)
  }

  const fingerSpread = () => {
    const [a, b] = [...fingers.current.values()]
    return { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number] }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return
    wrap.current!.setPointerCapture(e.pointerId)
    const [px, py] = local(e)
    const touch = e.pointerType === 'touch'
    if (touch) {
      fingers.current.set(e.pointerId, [px, py])
      // A second finger: a pinch. What the first one began is dropped (a stroke goes back; a press waiting is forgotten)
      if (fingers.current.size === 2) {
        if (gesture.current) cancel()
        gesture.current = null
        waiting.current = null
        pinchHeld.current = true
        pinch.current = { ...fingerSpread(), view: getState().view }
        return
      }
      if (fingers.current.size > 2 || pinchHeld.current) return
    }
    const { view, drawing } = getState()
    if (space || e.button === 1) {
      panning.current = { x: px, y: py, panX: view.panX, panY: view.panY }
      return
    }
    // A handle of the selected shape (any tool that selects: Select and Text)
    const item = selected(getState())
    if (item && isShape(item) && (getState().tool === 'select' || getState().tool === 'text')) {
      const handle = handleAt(view, boundsOf(item), px, py)
      if (handle) {
        gesture.current = resizeSelected(item, handle)
        return
      }
    }
    const [ux, uy] = unitAt(view, px, py)
    // Outside the board: shapes, the brush and the eraser still start at the nearest unit; the others ignore it
    const outside = ux < 0 || uy < 0 || ux >= drawing.width || uy >= drawing.height
    if (outside && (getState().tool === 'fill' || getState().tool === 'eyedropper' || getState().tool === 'text' || getState().tool === 'select')) return
    // A finger: the press starts when it moves or lifts, so a pinch never paints or fills first
    if (touch) waiting.current = { at: unit(e), mods: mods(e) }
    else gesture.current = press(unit(e), mods(e))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const [px, py] = local(e)
    if (e.pointerType === 'touch' && fingers.current.has(e.pointerId)) {
      fingers.current.set(e.pointerId, [px, py])
      if (pinch.current && fingers.current.size >= 2) {
        // Zoom in whole steps (every unit the same size), keeping the unit under the fingers' middle under it
        const p = pinch.current
        const { dist, mid } = fingerSpread()
        const zoom = nearestZoom((p.view.zoom * dist) / Math.max(1, p.dist))
        const ux = (p.mid[0] - p.view.panX) / p.view.zoom
        const uy = (p.mid[1] - p.view.panY) / p.view.zoom
        setView({ zoom, panX: Math.round(mid[0] - ux * zoom), panY: Math.round(mid[1] - uy * zoom) })
        return
      }
      if (pinchHeld.current) return
    }
    if (panning.current) {
      const p = panning.current
      setView({ panX: Math.round(p.panX + px - p.x), panY: Math.round(p.panY + py - p.y) })
      return
    }
    const { view, drawing } = getState()
    const [ux, uy] = unitAt(view, px, py)
    if (e.pointerType !== 'touch') setHover(ux >= 0 && uy >= 0 && ux < drawing.width && uy < drawing.height ? [ux, uy] : null)
    if (waiting.current) {
      const w = waiting.current
      waiting.current = null
      gesture.current = press(w.at, w.mods)
    }
    gesture.current?.move(unit(e), mods(e))
  }

  const onPointerUp = (e: React.PointerEvent) => {
    panning.current = null
    if (e.pointerType === 'touch') {
      fingers.current.delete(e.pointerId)
      if (fingers.current.size < 2) pinch.current = null
      if (fingers.current.size === 0) pinchHeld.current = false
    }
    // A tap: the press it was waiting for, now
    if (waiting.current) {
      const w = waiting.current
      waiting.current = null
      gesture.current = press(w.at, w.mods)
    }
    const g = gesture.current
    gesture.current = null
    g?.up()
  }

  const onDoubleClick = () => {
    const item = selected(getState())
    if (item?.kind === 'text') editText()
  }

  const cursor = space || panning.current ? 'grab' : (CURSOR[tool] ?? 'crosshair')

  return (
    <div
      ref={wrap}
      className="board"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvas} />
      <StatusBar hover={hover} />
    </div>
  )
}

/** Under the board: the unit under the pointer, the zoom, the board's size, how many objects */
function StatusBar({ hover }: { hover: [number, number] | null }) {
  const zoom = useStore((s) => s.view.zoom)
  const d = useStore((s) => s.drawing)
  const notice = useStore((s) => s.notice)
  const objects = d.items.filter(isShape).length
  return (
    <div className="status" onPointerDown={(e) => e.stopPropagation()}>
      <span>{hover ? `x ${hover[0]}  y ${hover[1]}` : 'x –  y –'}</span>
      <span>
        {d.width} × {d.height} units
      </span>
      <span>{zoom}× zoom</span>
      <span>
        {objects} object{objects === 1 ? '' : 's'}
      </span>
      {notice && <span className="status-notice">{notice}</span>}
    </div>
  )
}
