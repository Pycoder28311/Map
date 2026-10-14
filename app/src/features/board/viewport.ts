// The board's view: where it sits on screen and how big. Pure (viewport.test.ts); useViewport.ts holds the state.
import type { Point } from './types'

/** The white sheet, in board units */
export const BOARD = { width: 1600, height: 1000 }
export const ZOOM = { min: 0.1, max: 8 }
/** Space around the board when it is fitted (px) */
export const FIT_MARGIN = 48
/** The most the board is enlarged by fitting it (a huge window does not blow it up) */
const FIT_MAX = 1.5
/** However far it is moved, this much of the board (px) stays in view */
export const KEEP_VISIBLE = 80

/** A board point `b` is at the screen point `b * scale + (x, y)` (the editor's own pixels) */
export type Viewport = { x: number; y: number; scale: number }
export type Size = { w: number; h: number }

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** Keeps at least KEEP_VISIBLE px of the board in view on every side */
export function clampView(view: Viewport, size: Size): Viewport {
  const w = BOARD.width * view.scale
  const h = BOARD.height * view.scale
  return {
    scale: view.scale,
    x: Math.min(Math.max(view.x, KEEP_VISIBLE - w), size.w - KEEP_VISIBLE),
    y: Math.min(Math.max(view.y, KEEP_VISIBLE - h), size.h - KEEP_VISIBLE),
  }
}

/** The whole board, centred, with a margin */
export function fitView(size: Size): Viewport {
  const fit = Math.min((size.w - 2 * FIT_MARGIN) / BOARD.width, (size.h - 2 * FIT_MARGIN) / BOARD.height)
  const scale = clamp(fit, ZOOM.min, FIT_MAX)
  return { scale, x: (size.w - BOARD.width * scale) / 2, y: (size.h - BOARD.height * scale) / 2 }
}

/** The rectangle (board units) centred and as big as fits, with a margin (focusing on an object) */
export function fitBounds(rect: { x: number; y: number; w: number; h: number }, size: Size, margin = 96, maxScale = 4): Viewport {
  const fit = Math.min((size.w - 2 * margin) / Math.max(rect.w, 1), (size.h - 2 * margin) / Math.max(rect.h, 1))
  const scale = clamp(fit, ZOOM.min, maxScale)
  const view = { scale, x: size.w / 2 - (rect.x + rect.w / 2) * scale, y: size.h / 2 - (rect.y + rect.h / 2) * scale }
  return clampView(view, size)
}

/** Real size (100%), centred */
export function actualView(size: Size): Viewport {
  return { scale: 1, x: (size.w - BOARD.width) / 2, y: (size.h - BOARD.height) / 2 }
}

/** Zooms by `factor`, the board point under `at` (editor pixels) staying under it */
export function zoomAt(view: Viewport, at: Point, factor: number, size: Size): Viewport {
  const scale = clamp(view.scale * factor, ZOOM.min, ZOOM.max)
  const ratio = scale / view.scale
  return clampView({ scale, x: at.x - (at.x - view.x) * ratio, y: at.y - (at.y - view.y) * ratio }, size)
}

export const panBy = (view: Viewport, dx: number, dy: number, size: Size): Viewport =>
  clampView({ ...view, x: view.x + dx, y: view.y + dy }, size)

export const screenToBoard = (view: Viewport, p: Point): Point => ({ x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale })
export const boardToScreen = (view: Viewport, p: Point): Point => ({ x: p.x * view.scale + view.x, y: p.y * view.scale + view.y })

export const insideBoard = (p: Point) => p.x >= 0 && p.y >= 0 && p.x <= BOARD.width && p.y <= BOARD.height

export const clampToBoard = (p: Point): Point => ({ x: clamp(p.x, 0, BOARD.width), y: clamp(p.y, 0, BOARD.height) })

/** How much a wheel turn zooms by (a pinch on a trackpad arrives as a wheel with ctrlKey and small steps) */
export function zoomFactorOf(e: { deltaY: number; deltaMode: number; ctrlKey: boolean }) {
  const pixels = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1)
  return Math.exp(-pixels * 0.0015 * (e.ctrlKey ? 6.6 : 1))
}
