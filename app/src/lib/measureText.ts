// Measuring a line of text: the canvas's own measurer, or an estimate where there is no canvas (tests).

let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null | undefined

/** One canvas context for the whole app, made when first needed */
function canvasContext() {
  if (context !== undefined) return context
  try {
    context = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1).getContext('2d') : typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  } catch {
    context = null
  }
  return context
}

/** The width of `text` in `font` (a CSS font shorthand); about 0.55 of the size per character where no canvas can measure */
export function measureText(font: string, text: string): number {
  const ctx = canvasContext()
  if (ctx) {
    ctx.font = font
    const width = ctx.measureText(text).width
    if (width > 0 || text === '') return width
  }
  const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16)
  return text.length * size * 0.55
}
