import { useState } from 'react'
import type { Point } from './types'
import type { Rect } from './bounds'
import { actualView, fitBounds, fitView, panBy, zoomAt, type Size, type Viewport } from './viewport'

// The view each map was left in (kept while the app is open, like the board itself)
const views = new Map<string, Viewport>()

/**
 * A map's view of its board. Until the user moves it, it is the fitted board (so it follows the page's size:
 * sidebar, panes, window); after that it is theirs. `size` is null until the page is measured.
 */
export function useViewport(mapId: string, size: Size | null, fitSize: Size | null = size) {
  const [own, setOwn] = useState<Viewport | null>(() => views.get(mapId) ?? null)
  // The fitted board is placed in `fitSize` (the editor's whole width, sidebar included), so opening a sidebar never moves it
  const view = own ?? (fitSize ? fitView(fitSize) : null)

  const update = (next: (current: Viewport) => Viewport) => {
    if (!size) return
    setOwn((prev) => {
      const value = next(prev ?? fitView(fitSize ?? size))
      views.set(mapId, value)
      return value
    })
  }

  return {
    view,
    /** Zooms by `factor` around `at` (editor pixels; the middle if not given) */
    zoom: (factor: number, at?: Point) => update((v) => zoomAt(v, at ?? { x: size!.w / 2, y: size!.h / 2 }, factor, size!)),
    pan: (dx: number, dy: number) => update((v) => panBy(v, dx, dy, size!)),
    /** The board fitted to what is visible now (beside an open sidebar too) */
    fit: () => update(() => fitView(size!)),
    actualSize: () => update(() => actualView(size!)),
    /** Fits the view to an object's rectangle (the modal's focus button) */
    focusOn: (rect: Rect) => update(() => fitBounds(rect, size!)),
  }
}
