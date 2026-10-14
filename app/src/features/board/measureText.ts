// Measuring text for the layout: the canvas's own measurer, or an estimate where there is no canvas (tests).
import { layoutOf, type Layout, type Measure } from './textLayout'
import type { TextObject } from './types'

let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined

function canvasContext() {
  if (context !== undefined) return context
  try {
    context = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1).getContext('2d') : typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  } catch {
    context = null
  }
  return context
}

/** The width of `text` in `font`; about 0.55 of the size per character where no canvas can measure */
export const measure: Measure = (font, text) => {
  const ctx = canvasContext()
  if (ctx) {
    ctx.font = font
    const width = ctx.measureText(text).width
    if (width > 0 || text === '') return width
  }
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16)
  return text.length * size * 0.55
}

/** The layout of a text object as the canvas will paint it */
export const layoutOfText = (o: TextObject): Layout => layoutOf(o, measure)
