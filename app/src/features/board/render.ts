// Paints a board on the editor's canvas (crisp at any zoom: redrawn with the view's transform, never a scaled bitmap).
import { ARROW_HEADS, arrowHead, endTangents, headInset } from './arrows'
import { colourRuns, edgeColours, labelPoint, wrapWords } from './borders'
import { textBox } from './bounds'
import { drawOrder } from './layers'
import { layoutOfText, measure } from './measureText'
import { fontOf, LINE_HEIGHT } from './textLayout'
import { flattenedOf, isClosed, softened, trimEnds } from './pathGeometry'
import { PIN_BODY, PIN_HEIGHT, PIN_ICON_PATHS, PIN_WIDTH } from './pinIcons'
import { areaOf } from './polygon'
import { strokeParts, type Parts } from './strokeParts'
import type { Board, BoardObject, Point, PointObject, Style, TextObject } from './types'
import { BOARD, type Size, type Viewport } from './viewport'

/** One path in the context's current transform. A single point is a dot */
export function drawStroke(ctx: CanvasRenderingContext2D, points: Point[], style: Style, scale: number, closed = false) {
  ctx.globalAlpha = style.opacity / 100
  ctx.strokeStyle = style.color
  // "Same width as I zoom": the stroke keeps its screen width
  ctx.lineWidth = style.fixedWidth ? style.thickness / scale : style.thickness
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y)
  if (closed) ctx.closePath()
  if (points.length === 1) ctx.lineTo(points[0].x + 0.01, points[0].y)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** The context's transform from board units to canvas pixels */
export function applyView(ctx: CanvasRenderingContext2D, view: Viewport, dpr: number) {
  ctx.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.x, dpr * view.y)
}

/** How much wider (screen px) the halo of a hovered object is */
const HALO_PX = 6

function pathOf(ctx: CanvasRenderingContext2D, line: Point[], closed: boolean) {
  ctx.beginPath()
  ctx.moveTo(line[0].x, line[0].y)
  for (const p of line.slice(1)) ctx.lineTo(p.x, p.y)
  if (closed && line.length > 2) ctx.closePath()
  if (line.length === 1) ctx.lineTo(line[0].x + 0.01, line[0].y)
}

function strokeStyle(ctx: CanvasRenderingContext2D, style: Style, scale: number, extraPx = 0) {
  ctx.strokeStyle = style.color
  ctx.lineWidth = (style.fixedWidth ? style.thickness / scale : style.thickness) + extraPx / scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/** An area's name at its centre and its description under it. Sized to the area, in board units (so it zooms with the map) */
function paintLabel(ctx: CanvasRenderingContext2D, ring: Point[], name: string, description: string, color: string, opacity: number) {
  if (!name && !description) return
  const at = labelPoint(ring)
  const size = Math.min(28, Math.max(10, Math.sqrt(areaOf(ring)) / 7))
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.fillStyle = color
  ctx.globalAlpha = Math.max(0.6, opacity / 100)
  let y = at.y
  const line = (text: string, px: number, weight: number) => {
    ctx.font = `${weight} ${px}px system-ui, sans-serif`
    ctx.lineWidth = px / 5
    ctx.strokeText(text, at.x, y)
    ctx.fillText(text, at.x, y)
    y += px * 1.25
  }
  if (name) line(name, size, 600)
  if (description) for (const text of wrapWords(description, 26)) line(text, size * 0.6, 400)
  ctx.restore()
}

/** A text: each fragment in its own font and colour, the box turned about its centre. Lines sit on a common baseline */
function paintText(ctx: CanvasRenderingContext2D, o: TextObject) {
  const layout = layoutOfText(o)
  if (layout.lines.every((l) => l.fragments.length === 0)) return
  const box = textBox(o)
  ctx.save()
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2)
  ctx.rotate((o.rotation * Math.PI) / 180)
  ctx.translate(-box.w / 2, -box.h / 2)
  ctx.globalAlpha = o.opacity / 100
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  for (const line of layout.lines) {
    const size = line.height / LINE_HEIGHT
    // The baseline of a line of `size`: its text is 1.2 × size tall, centred in the line, the letters sit 0.95 of that down
    const baseline = line.y + (line.height - size * 1.2) / 2 + size * 0.95
    for (const f of line.fragments) {
      const font = fontOf(f.run, f.run.size)
      ctx.font = font
      ctx.fillStyle = f.run.color ?? o.color
      ctx.fillText(f.text, f.x, baseline)
      if (f.run.underline || f.run.strike) {
        const width = measure(font, f.text.replace(/\s+$/, ''))
        ctx.fillRect(f.x, f.run.underline ? baseline + f.run.size * 0.12 : baseline - f.run.size * 0.3, width, Math.max(1, f.run.size / 16))
      }
    }
  }
  ctx.restore()
}

// The pin's shapes are made once: Path2D is not around in tests
const pinPaths = new Map<string, Path2D>()
const pathFor = (d: string) => {
  let p = pinPaths.get(d)
  if (!p) pinPaths.set(d, (p = new Path2D(d)))
  return p
}

/** A pin: a teardrop in its colour with a white disc and its icon, the tip at the anchor */
export function paintPoint(ctx: CanvasRenderingContext2D, o: PointObject, hovered = false) {
  ctx.save()
  ctx.translate(o.anchor.x - PIN_WIDTH / 2, o.anchor.y - PIN_HEIGHT)
  const body = pathFor(PIN_BODY)
  if (hovered) {
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = o.color
    ctx.lineWidth = 7
    ctx.lineJoin = 'round'
    ctx.stroke(body)
    ctx.globalAlpha = 1
  }
  ctx.fillStyle = o.color
  ctx.fill(body)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(PIN_WIDTH / 2, 13.5, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.translate(PIN_WIDTH / 2 - 7, 13.5 - 7)
  ctx.scale(14 / 24, 14 / 24)
  ctx.fillStyle = o.color
  ctx.fill(pathFor(PIN_ICON_PATHS[o.icon].path))
  ctx.restore()
}

/** One object of any path kind (line, border, shape): fill, line type, arrows, name, and a halo when hovered */
export function paintObject(ctx: CanvasRenderingContext2D, o: BoardObject, scale: number, hovered = false, namedByText = false) {
  if (o.kind === 'text') return paintText(ctx, o)
  if (o.kind === 'point') return paintPoint(ctx, o, hovered)
  if (o.kind !== 'line' && o.kind !== 'border' && o.kind !== 'shape') return
  const style = o.style
  const unit = style.fixedWidth ? 1 / scale : 1
  const closed = isClosed(o)
  const flat = flattenedOf(o)
  let outline = o.kind === 'line' && style.way === 'exact' ? softened(flat, style.amount) : o.kind === 'border' && style.way === 'exact' ? softened(flat, style.amount, true) : flat

  // The inside: an area's is lighter still while it is hovered
  const inside = o.kind === 'shape' ? o.fill : o.kind === 'border' ? (o.fill ?? (hovered ? { color: style.color, opacity: 8 } : null)) : null
  if (inside) {
    pathOf(ctx, outline, true)
    ctx.globalAlpha = (o.kind === 'border' && hovered ? Math.min(60, inside.opacity * 2) : inside.opacity) / 100
    ctx.fillStyle = inside.color
    ctx.fill()
  }
  if (style.thickness <= 0 && o.kind === 'shape') {
    ctx.globalAlpha = 1
    return
  }

  // A filled arrow head covers the line's end, so the line stops short of its tip
  const arrows = o.kind === 'line' && (style.arrow.start || style.arrow.end) ? endTangents(outline) : null
  const head = ARROW_HEADS[style.arrow.style] ?? ARROW_HEADS[0]
  const size = style.arrow.size * unit
  if (arrows) outline = trimEnds(outline, style.arrow.start ? headInset(head, size) : 0, style.arrow.end ? headInset(head, size) : 0)

  // What is stroked, in which colour: one outline, or an area's runs of different colours
  const strokes: { parts: Parts; color: string }[] =
    o.kind === 'border' && o.edges?.length && !o.handles && style.amount === 0
      ? colourRuns(o.points, edgeColours(o)).map((run) => ({ parts: strokeParts(run.line, style, unit, false), color: run.color }))
      : [{ parts: strokeParts(outline, style, unit, closed), color: style.color }]
  const strokeAll = (extraPx: number, alpha: number) => {
    ctx.globalAlpha = alpha
    strokeStyle(ctx, style, scale, extraPx)
    for (const { parts, color } of strokes) {
      ctx.strokeStyle = color
      for (const line of parts.lines) {
        pathOf(ctx, line, parts.closed)
        ctx.stroke()
      }
    }
  }
  if (hovered) strokeAll(HALO_PX, (style.opacity / 100) * 0.25)
  strokeAll(0, style.opacity / 100)

  if (arrows) {
    ctx.globalAlpha = style.opacity / 100
    ctx.fillStyle = style.color
    const ends = [
      style.arrow.start && { tip: flat[0], angle: arrows.start },
      style.arrow.end && { tip: flat[flat.length - 1], angle: arrows.end },
    ]
    for (const end of ends) {
      if (!end) continue
      const shape = arrowHead(head, end.tip, end.angle, size)
      for (const part of shape.parts) {
        pathOf(ctx, part, shape.closed)
        if (shape.filled) ctx.fill()
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
  if (o.kind === 'border') paintLabel(ctx, flat, namedByText ? '' : o.name, o.description, style.color, style.opacity)
}

/** The white sheet, then every object bottom to top, then `extra` (what is being drawn, not in the board yet) */
export function paintBoard(ctx: CanvasRenderingContext2D, board: Board, view: Viewport, size: Size, dpr: number, extra: BoardObject[] = [], hover: number | null = null, editing: number | null = null) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size.w, size.h)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(view.x, view.y, BOARD.width * view.scale, BOARD.height * view.scale)
  ctx.restore()

  applyView(ctx, view, dpr)
  // The areas whose name is a text object paint no label of their own
  const named = new Set<number>()
  for (const o of board.objects) if (o.kind === 'text' && o.isName && o.attach !== undefined) named.add(o.attach)
  for (const o of drawOrder(board)) if (o.id !== editing) paintObject(ctx, o, view.scale, o.id === hover, named.has(o.id))
  for (const o of extra) paintObject(ctx, o, view.scale)
}
