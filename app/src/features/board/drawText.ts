// What the Text tool makes from a click or a drag, and where a click lands. Pure (drawText.test.ts).
import { areaAt } from './borders'
import { hitTestPart } from './hit'
import { nameTextOf } from './follow'
import type { TextPen } from './pen'
import { LAYER_MAIN, type Board, type BorderObject, type Point, type TextObject } from './types'

/** A drag shorter than this (board units) is a click: text that grows as it is typed */
export const DRAG_MIN = 8
/** Narrowest box a drag makes */
export const MIN_BOX = 20

type Draft = Omit<TextObject, 'id'>

/** An empty text for the pen, its box starting at `anchor` and wrapping at `width` (0: it grows as it is typed) */
export function newText(anchor: Point, width: number, pen: TextPen): Draft {
  return { kind: 'text', layer: LAYER_MAIN, name: '', links: [], anchor: { x: Math.round(anchor.x), y: Math.round(anchor.y) }, text: '', width, rotation: Math.round(pen.rotation), align: pen.align, size: pen.size, color: pen.color, opacity: pen.opacity, ...(pen.fixedSize ? { fixedSize: true } : {}), ...(pen.font ? { font: pen.font } : {}), ...(pen.weight !== 400 ? { weight: pen.weight } : {}), ...(pen.italic ? { italic: true } : {}), ...(pen.underline ? { underline: true } : {}), ...(pen.strike ? { strike: true } : {}), ...(pen.oblique ? { oblique: true } : {}), ...(pen.underlineColor ? { underlineColor: pen.underlineColor } : {}), ...(pen.strikeColor ? { strikeColor: pen.strikeColor } : {}),
    ...(pen.strokeWidth > 0 ? { strokeColor: pen.strokeColor, strokeWidth: pen.strokeWidth, ...(pen.strokeOpacity !== 100 ? { strokeOpacity: pen.strokeOpacity } : {}) } : {}),
    ...(pen.shadowBlur > 0 || pen.shadowDistance > 0 ? { shadowColor: pen.shadowColor, shadowBlur: pen.shadowBlur, shadowDistance: pen.shadowDistance } : {}),
    ...(pen.curve !== 0 ? { curve: pen.curve } : {}),
    ...(pen.spacing !== 0 ? { spacing: pen.spacing } : {}),
    ...(pen.lineGap > 0 ? { lineGap: pen.lineGap } : {}),
    ...(pen.boxed ? { boxed: true } : {}),
    ...(pen.boxed && pen.boxShape !== 'square' ? { boxShape: pen.boxShape } : {}),
    ...(pen.boxed && pen.boxColor ? { boxColor: pen.boxColor } : {}),
  }
}

/** The text a click or a drag from `from` to `to` starts */
export function textFromGesture(from: Point, to: Point, pen: TextPen): Draft {
  const dx = Math.abs(to.x - from.x)
  if (dx < DRAG_MIN) return newText(from, 0, pen)
  return newText({ x: Math.min(from.x, to.x), y: Math.min(from.y, to.y) }, Math.max(MIN_BOX, Math.round(dx)), pen)
}

/** The text under the point, if the top thing there is one (clicking it edits it) */
export function textAt(board: Board, p: Point, tolerance: number): TextObject | null {
  const found = hitTestPart(board, p, tolerance)
  return found?.object.kind === 'text' ? found.object : null
}

/** The area a new text at `p` names: the topmost area under it, when it has no name yet (D6); else null, an ordinary text */
export function areaToName(board: Board, p: Point): BorderObject | null {
  const area = areaAt(board, p)
  return area && area.name === '' && !nameTextOf(board, area.id) ? area : null
}
