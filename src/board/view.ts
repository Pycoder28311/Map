// Screen ↔ units. A unit is always `zoom` CSS pixels (a whole number), drawn at whole device pixels, so every unit looks the same size.
import type { Box } from '../model/raster'
import { ZOOMS, type View } from '../store/store'

/** The unit under a point of the board's element (may be outside the board: callers clamp or ignore) */
export const unitAt = (view: View, px: number, py: number): [number, number] => [Math.floor((px - view.panX) / view.zoom), Math.floor((py - view.panY) / view.zoom)]

export const clampUnit = ([x, y]: [number, number], width: number, height: number): [number, number] => [
  Math.min(width - 1, Math.max(0, x)),
  Math.min(height - 1, Math.max(0, y)),
]

/** The next zoom step up (+1) or down (−1) */
export function stepZoom(zoom: number, by: 1 | -1) {
  const i = ZOOMS.findIndex((z) => z >= zoom)
  const at = i < 0 ? ZOOMS.length - 1 : i
  return ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS[at] === zoom ? at + by : by > 0 ? at : at - 1))]
}

/** The biggest zoom step that shows the whole board in this area, centred */
export function fitView(width: number, height: number, areaW: number, areaH: number): View {
  const room = Math.min((areaW - 48) / width, (areaH - 48) / height)
  const zoom = [...ZOOMS].reverse().find((z) => z <= room) ?? 1
  return { zoom, panX: Math.round((areaW - width * zoom) / 2), panY: Math.round((areaH - height * zoom) / 2) }
}

/** A zoom change that keeps the unit under (px, py) where it is */
export function zoomAt(view: View, zoom: number, px: number, py: number): View {
  const ux = (px - view.panX) / view.zoom
  const uy = (py - view.panY) / view.zoom
  return { zoom, panX: Math.round(px - ux * zoom), panY: Math.round(py - uy * zoom) }
}

export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
export const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
/** Half a handle's size on screen (CSS px) */
export const HANDLE_HALF = 5

/** A handle's centre on screen, for a box in units */
export function handlePoint(view: View, box: Box, handle: Handle): [number, number] {
  const left = view.panX + box.x * view.zoom
  const top = view.panY + box.y * view.zoom
  const right = left + box.w * view.zoom
  const bottom = top + box.h * view.zoom
  const x = handle.includes('w') ? left : handle.includes('e') ? right : (left + right) / 2
  const y = handle.startsWith('n') ? top : handle.startsWith('s') ? bottom : (top + bottom) / 2
  return [x, y]
}

/** The handle under a screen point, if any */
export function handleAt(view: View, box: Box, px: number, py: number): Handle | null {
  for (const handle of HANDLES) {
    const [hx, hy] = handlePoint(view, box, handle)
    if (Math.abs(px - hx) <= HANDLE_HALF + 2 && Math.abs(py - hy) <= HANDLE_HALF + 2) return handle
  }
  return null
}

/** A box resized by dragging one handle to a unit (the opposite side stays; at least 1 unit) */
export function resizeBox(box: Box, handle: Handle, [ux, uy]: [number, number], keepRatio: boolean): Box {
  let left = box.x
  let top = box.y
  let right = box.x + box.w // exclusive
  let bottom = box.y + box.h
  if (handle.includes('w')) left = Math.min(ux, right - 1)
  if (handle.includes('e')) right = Math.max(ux + 1, left + 1)
  if (handle.startsWith('n')) top = Math.min(uy, bottom - 1)
  if (handle.startsWith('s')) bottom = Math.max(uy + 1, top + 1)
  if (keepRatio && handle.length === 2) {
    const ratio = box.w / box.h
    const w = right - left
    const h = bottom - top
    if (w / h > ratio) {
      const nw = Math.max(1, Math.round(h * ratio))
      if (handle.includes('w')) left = right - nw
      else right = left + nw
    } else {
      const nh = Math.max(1, Math.round(w / ratio))
      if (handle.startsWith('n')) top = bottom - nh
      else bottom = top + nh
    }
  }
  return { x: left, y: top, w: right - left, h: bottom - top }
}
