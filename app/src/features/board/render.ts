// Paints a board on the editor's canvas (crisp at any zoom: redrawn with the view's transform, never a scaled bitmap).
import { hasShadow, shadowOffset } from './textShadow'
import { ARROW_HEADS, arrowHead, endTangents, headInset } from './arrows'
import { colourRuns, edgeColours, labelPoint, wrapWords } from './borders'
import { bendAbove, boxPads, textLayoutBox } from './bounds'
import { ROADS, roadLayerColour } from './roadTextures'
import { fillImage, texturePattern } from './fillTextures'
import { drawOrder } from './layers'
import { layoutOfText, measure } from './measureText'
import { placeOnArc } from './textCurve'
import { fontOf, LINE_HEIGHT } from './textLayout'
import { flattenedOf, isClosed, softened, trimEnds } from './pathGeometry'
import { PIN_BODY, PIN_HEIGHT, PIN_ICON_PATHS, PIN_WIDTH } from './pinIcons'
import { areaOf } from './polygon'
import { softnessOf } from './style'
import { strokeParts, type Parts } from './strokeParts'
import type { Board, BoardObject, Point, PointObject, Style, TextObject } from './types'
import { BOARD, type Size, type Viewport } from './viewport'

/** The least a line or border is wide on the screen (px), so it still shows far zoomed out */
const MIN_WIDTH_PX = 1.5

/**
 * How wide (screen px) a line or border of this thickness is at this zoom, as roads on Google Maps: it grows and shrinks with the zoom, but
 * gently (with the square root of the zoom), staying between half and three times the set thickness and never under MIN_WIDTH_PX.
 */
export function screenWidth(thickness: number, scale: number): number {
  if (thickness <= 0) return 0
  return Math.max(thickness * Math.min(Math.max(Math.sqrt(scale), 0.5), 3), Math.min(thickness, MIN_WIDTH_PX))
}

/** One path in the context's current transform. A single point is a dot */
export function drawStroke(ctx: CanvasRenderingContext2D, points: Point[], style: Style, scale: number, closed = false) {
  ctx.globalAlpha = style.opacity / 100
  ctx.strokeStyle = style.color
  ctx.lineWidth = screenWidth(style.thickness, scale) / scale
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

function strokeStyle(ctx: CanvasRenderingContext2D, style: Style, scale: number, unit: number, extraPx = 0) {
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.thickness * unit + extraPx / scale
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

/** The frame round a text (a w × h box at the origin): a square, or only its corners */
function paintFrame(ctx: CanvasRenderingContext2D, o: TextObject, w: number, h: number) {
  const colour = o.boxColor ?? o.color
  ctx.save()
  ctx.lineJoin = 'miter'
  ctx.lineWidth = Math.max(1, o.size / 14)
  ctx.strokeStyle = colour
  if (o.boxShape === 'corners') {
    // Only the corners: a short bracket in each, a quarter of the shorter side long
    const n = Math.min(w, h) / 4
    ctx.beginPath()
    for (const [x, y, dx, dy] of [[0, 0, 1, 1], [w, 0, -1, 1], [w, h, -1, -1], [0, h, 1, -1]]) {
      ctx.moveTo(x + dx * n, y)
      ctx.lineTo(x, y)
      ctx.lineTo(x, y + dy * n)
    }
    ctx.stroke()
  } else ctx.strokeRect(0, 0, w, h)
  ctx.restore()
}

/** A text: each fragment in its own font and colour, the box turned about its centre. Lines sit on a common baseline */
function paintText(ctx: CanvasRenderingContext2D, o: TextObject, scale: number) {
  const layout = layoutOfText(o)
  if (layout.lines.every((l) => l.fragments.length === 0)) return
  const box = textLayoutBox(o)
  const curve = o.curve ?? 0
  ctx.save()
  // Keeping its size on the screen: drawn at its size over scale, about its corner
  if (o.fixedSize) {
    ctx.translate(o.anchor.x, o.anchor.y)
    ctx.scale(1 / scale, 1 / scale)
    ctx.translate(-o.anchor.x, -o.anchor.y)
  }
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2)
  ctx.rotate((o.rotation * Math.PI) / 180)
  ctx.translate(-box.w / 2, -box.h / 2)
  ctx.globalAlpha = o.opacity / 100
  const pads = boxPads(o)
  if (o.boxed) paintFrame(ctx, o, box.w, box.h)
  ctx.translate(pads.x, pads.y + bendAbove(o))
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.lineJoin = 'round'
  // The canvas's shadow is in screen pixels, not board units: this much is a board unit now
  const pixel = Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
  const shadowed = hasShadow(o)
  const offset = shadowOffset(o)
  const width = layout.width
  for (const line of layout.lines) {
    const size = line.size
    // The baseline of a line of `size`: its text is 1.2 × size tall, centred in the line, the letters sit 0.95 of that down
    const baseline = line.y + (size * LINE_HEIGHT - size * 1.2) / 2 + size * 0.95
    for (const f of line.fragments) {
      const font = fontOf(f.run, f.run.size)
      ctx.font = font
      const fill = f.run.color ?? o.color
      // Draws `text` with its left end at (x, 0), its underline and strikethrough under it
      const gap = f.run.spacing ?? 0
      const draw = (text: string, x: number) => {
        if (shadowed) {
          ctx.shadowColor = o.shadowColor ?? '#000000'
          ctx.shadowBlur = (o.shadowBlur ?? 0) * pixel
          ctx.shadowOffsetX = offset.x * pixel
          ctx.shadowOffsetY = offset.y * pixel
        }
        if ((o.strokeWidth ?? 0) > 0) {
          ctx.strokeStyle = o.strokeColor ?? '#000000'
          ctx.lineWidth = o.strokeWidth!
          const alpha = ctx.globalAlpha
          ctx.globalAlpha = alpha * ((o.strokeOpacity ?? 100) / 100)
          ctx.strokeText(text, x, 0)
          ctx.globalAlpha = alpha
          // The fill over the stroke's inner half (the shadow is already made by the stroke)
          ctx.shadowColor = 'transparent'
        }
        ctx.fillStyle = fill
        ctx.fillText(text, x, 0)
        ctx.shadowColor = 'transparent'
        if (f.run.underline || f.run.strike) {
          const length = measure(font, text.replace(/\s+$/, '')) + gap * Array.from(text.replace(/\s+$/, '')).length
          const thickness = Math.max(1, f.run.size / 16)
          if (f.run.underline) {
            ctx.fillStyle = f.run.underlineColor ?? fill
            ctx.fillRect(x, f.run.size * 0.12, length, thickness)
          }
          if (f.run.strike) {
            ctx.fillStyle = f.run.strikeColor ?? fill
            ctx.fillRect(x, -f.run.size * 0.3, length, thickness)
          }
        }
      }
      if (curve === 0 && gap === 0) {
        ctx.save()
        ctx.translate(0, baseline)
        draw(f.text, f.x)
        ctx.restore()
        continue
      }
      // Bent or spaced: each letter on its own, put on the arc and turned with it when bent
      let x = f.x
      for (const letter of f.text) {
        const w = measure(font, letter)
        ctx.save()
        if (curve === 0) {
          ctx.translate(0, baseline)
          draw(letter, x)
        } else {
          const at = placeOnArc(curve, width, baseline, x + w / 2 - width / 2)
          ctx.translate(at.x, at.y)
          ctx.rotate(at.angle)
          draw(letter, -w / 2)
        }
        ctx.restore()
        x += w + gap
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

/** The picture over the area's whole box (cropped to the outline, never stretched) */
function paintPicture(ctx: CanvasRenderingContext2D, picture: HTMLImageElement, outline: Point[]) {
  const xs = outline.map((p) => p.x)
  const ys = outline.map((p) => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const w = Math.max(...xs) - x
  const h = Math.max(...ys) - y
  if (w <= 0 || h <= 0) return
  const k = Math.max(w / picture.naturalWidth, h / picture.naturalHeight)
  const dw = picture.naturalWidth * k
  const dh = picture.naturalHeight * k
  ctx.save()
  ctx.clip()
  ctx.drawImage(picture, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

/** One object of any path kind (line, border, shape): fill, line type, arrows, name, and a halo when hovered */
export function paintObject(ctx: CanvasRenderingContext2D, o: BoardObject, scale: number, hovered = false, namedByText = false) {
  if (o.kind === 'text') return paintText(ctx, o, scale)
  if (o.kind === 'point') return paintPoint(ctx, o, hovered)
  if (o.kind !== 'line' && o.kind !== 'border' && o.kind !== 'shape') return
  const style = o.style
  // A line and a border are as thick on the screen as screenWidth says (their thickness is in pixels at zoom 1); a shape's outline follows its own setting
  const fixed = o.kind !== 'shape' || style.fixedWidth
  const unit = fixed ? (style.thickness > 0 ? screenWidth(style.thickness, scale) / style.thickness / scale : 1 / scale) : 1
  const closed = isClosed(o)
  const flat = flattenedOf(o)
  const soft = softnessOf(style)
  let outline = soft > 0 ? softened(flat, soft, closed) : flat

  // The inside: an area's is lighter still while it is hovered
  const inside = o.kind === 'shape' ? o.fill : o.kind === 'border' && closed ? (o.fill ?? (hovered ? { color: style.color, opacity: 8 } : null)) : null
  if (inside) {
    pathOf(ctx, outline, true)
    ctx.globalAlpha = (o.kind === 'border' && hovered ? Math.min(60, inside.opacity * 2) : inside.opacity) / 100
    ctx.fillStyle = texturePattern(ctx, inside.texture, inside.color) ?? inside.color
    const picture = inside.image ? fillImage(inside.image) : null
    if (picture) paintPicture(ctx, picture, outline)
    if (style.shadow) {
      const pixel = Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
      ctx.shadowColor = style.shadow.color
      ctx.shadowBlur = style.shadow.blur * pixel
      ctx.shadowOffsetX = ctx.shadowOffsetY = style.shadow.distance * pixel
    }
    // A picture is the inside by itself; with a texture, that goes over it
    if (!picture || inside.texture) ctx.fill()
    ctx.shadowColor = 'transparent'
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
    o.kind === 'border' && o.edges?.length && !o.handles && soft === 0
      ? colourRuns(o.points, edgeColours(o)).map((run) => ({ parts: strokeParts(run.line, style, unit, false), color: run.color }))
      : [{ parts: strokeParts(outline, style, unit, closed), color: style.color }]
  // `colour` paints every run in that one colour (the stroke round the line); `reach` is how much wider than the line (board units, both sides together)
  const strokeAll = (extraPx: number, alpha: number, colour?: string, reach = 0) => {
    ctx.globalAlpha = alpha
    strokeStyle(ctx, style, scale, unit, extraPx)
    ctx.lineWidth += reach * unit
    for (const { parts, color } of strokes) {
      ctx.strokeStyle = colour ?? color
      for (const line of parts.lines) {
        pathOf(ctx, line, parts.closed)
        ctx.stroke()
      }
    }
  }
  if (hovered) strokeAll(HALO_PX, (style.opacity / 100) * 0.25)
  // The shadow is made by the outermost thing painted: the stroke round the line, else the line itself
  const shadow = style.shadow
  if (shadow) {
    // The canvas's shadow is in screen pixels, not board units
    const pixel = Math.hypot(ctx.getTransform().a, ctx.getTransform().b)
    ctx.shadowColor = shadow.color
    ctx.shadowBlur = shadow.blur * pixel
    ctx.shadowOffsetX = ctx.shadowOffsetY = shadow.distance * pixel
  }
  if (style.stroke) {
    strokeAll(0, (style.opacity / 100) * (style.stroke.opacity / 100), style.stroke.color, style.stroke.width * 2)
    ctx.shadowColor = 'transparent'
  }
  const road = style.road ? ROADS[style.road] : undefined
  if (road?.layers.length) {
    // A road: its layers, widest first, each along the whole line (the shadow only under the first)
    const base = style.thickness * unit
    ctx.globalAlpha = style.opacity / 100
    ctx.lineJoin = 'round'
    road.layers.forEach((layer, i) => {
      const width = base * layer.width
      ctx.strokeStyle = roadLayerColour(layer, style.color)
      ctx.lineWidth = width
      ctx.lineCap = layer.dash ? (layer.cap ?? 'butt') : 'butt'
      ctx.setLineDash(layer.dash ? layer.dash.map((d) => Math.max(d * base, 0.001)) : [])
      for (const part of strokes) for (const line of part.parts.lines) {
        pathOf(ctx, line, part.parts.closed)
        ctx.stroke()
      }
      if (i === 0) ctx.shadowColor = 'transparent'
    })
    ctx.setLineDash([])
  } else strokeAll(0, style.opacity / 100)
  ctx.shadowColor = 'transparent'

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
  if (o.kind === 'border' && closed) paintLabel(ctx, flat, namedByText ? '' : o.name, o.description, style.color, style.opacity)
}

/** The picture over the whole sheet, covering it (the part that does not fit is cut off, equally at both sides) */
function paintBackground(ctx: CanvasRenderingContext2D, image: CanvasImageSource, view: Viewport) {
  const w = (image as HTMLImageElement).naturalWidth
  const h = (image as HTMLImageElement).naturalHeight
  if (!w || !h) return
  const ratio = BOARD.width / BOARD.height
  const sw = w / h > ratio ? h * ratio : w
  const sh = w / h > ratio ? h : w / ratio
  ctx.drawImage(image, (w - sw) / 2, (h - sh) / 2, sw, sh, view.x, view.y, BOARD.width * view.scale, BOARD.height * view.scale)
}

/** The white sheet, then the background picture if there is one, then every object bottom to top, then `extra` (what is being drawn, not in the board yet) */
export function paintBoard(ctx: CanvasRenderingContext2D, board: Board, view: Viewport, size: Size, dpr: number, extra: BoardObject[] = [], hover: number | null = null, editing: number | null = null, background: CanvasImageSource | null = null) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, size.w, size.h)

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 4
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(view.x, view.y, BOARD.width * view.scale, BOARD.height * view.scale)
  ctx.restore()
  if (background) paintBackground(ctx, background, view)

  applyView(ctx, view, dpr)
  // The areas whose name is a text object paint no label of their own
  const named = new Set<number>()
  for (const o of board.objects) if (o.kind === 'text' && o.isName && o.attach !== undefined) named.add(o.attach)
  for (const o of drawOrder(board)) if (o.id !== editing) paintObject(ctx, o, view.scale, o.id === hover, named.has(o.id))
  for (const o of extra) paintObject(ctx, o, view.scale)
}
