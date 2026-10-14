// A picture of a map's content: the screenshot, and the thumbnails of the presenter. Pure parts tested (snapshot.test.ts).
import { unionBounds, type Rect } from './bounds'
import { drawOrder } from './layers'
import { paintObject } from './render'
import type { Board } from './types'
import { BOARD } from './viewport'

/** Space around the content in a picture (board units) */
export const SNAPSHOT_MARGIN = 40
/** The longest side a picture may have (px): bigger canvases fail in browsers */
export const SNAPSHOT_MAX_PX = 8192

/** What a picture shows: the content with a margin, kept inside the board; the whole board when there is nothing */
export function snapshotRect(board: Board): Rect {
  const content = unionBounds(board.objects)
  if (!content) return { x: 0, y: 0, w: BOARD.width, h: BOARD.height }
  const x = Math.max(0, content.x - SNAPSHOT_MARGIN)
  const y = Math.max(0, content.y - SNAPSHOT_MARGIN)
  const right = Math.min(BOARD.width, content.x + content.w + SNAPSHOT_MARGIN)
  const bottom = Math.min(BOARD.height, content.y + content.h + SNAPSHOT_MARGIN)
  return { x, y, w: Math.max(1, right - x), h: Math.max(1, bottom - y) }
}

/** The scale to paint `rect` at: `wanted`, lowered so the longest side stays within `maxPx` */
export const snapshotScale = (rect: Rect, wanted: number, maxPx = SNAPSHOT_MAX_PX) => Math.min(wanted, maxPx / Math.max(rect.w, rect.h))

/** The content on a white sheet, no editor outlines. `scale`: pixels per board unit */
export function paintSnapshot(canvas: HTMLCanvasElement, board: Board, rect: Rect, scale: number) {
  canvas.width = Math.max(1, Math.round(rect.w * scale))
  canvas.height = Math.max(1, Math.round(rect.h * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, -rect.x * scale, -rect.y * scale)
  for (const o of drawOrder(board)) paintObject(ctx, o, scale)
  return true
}

/** The map as a PNG (null when the browser could not make one) */
export function snapshotBlob(board: Board, scale = 2): Promise<Blob | null> {
  const rect = snapshotRect(board)
  const canvas = document.createElement('canvas')
  if (!paintSnapshot(canvas, board, rect, snapshotScale(rect, scale))) return Promise.resolve(null)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

const thumbnails = new WeakMap<Board, string>()

/** A small picture of the board as a data address (cached per board: boards never change). Undefined for an empty board */
export function thumbnailOf(board: Board, width = 240): string | undefined {
  if (board.objects.length === 0) return undefined
  const cached = thumbnails.get(board)
  if (cached) return cached
  const rect = snapshotRect(board)
  const canvas = document.createElement('canvas')
  if (!paintSnapshot(canvas, board, rect, Math.min(1, width / rect.w))) return undefined
  const url = canvas.toDataURL('image/png')
  thumbnails.set(board, url)
  return url
}
