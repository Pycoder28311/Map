// Drag surfaces: areas that say how a dragged object looks over them (the sidebar: a sidebar row; the
// Dashboard's list: a card row…). The floating copy (DragFloat) takes the look of the surface under
// the pointer; anywhere else, a small pill. One registry for the app (there's one drag context).
import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import type { ButtonIcon } from '../../components/ui/icons/IconSlot'

/** What a look gets: the dragged object */
export type DragLookItem = {
  label: string
  icon?: ButtonIcon
  kind?: string
  objectId?: string
  /** Where it was grabbed, as a fraction of its box (e.g. the origin of a lift animation) */
  grab: { fx: number; fy: number }
}

export type DragLook = (item: DragLookItem) => ReactNode

const registry = new Map<string, { ref: RefObject<HTMLElement | null>; look: DragLook }>()

/**
 * Registers an area as a drag surface: while an object is dragged over `ref`'s element, the floating
 * copy looks like `look(item)`. Ids are unique (e.g. "sidebar", "project-list")
 */
export function useDragSurface(id: string, ref: RefObject<HTMLElement | null>, look: DragLook) {
  // The latest look, without re-registering on every render
  const latest = useRef(look)
  useEffect(() => {
    latest.current = look
  })
  useEffect(() => {
    registry.set(id, { ref, look: (item) => latest.current(item) })
    return () => {
      registry.delete(id)
    }
  }, [id, ref])
}

/** The surface under a point (viewport px): the smallest one containing it, if any */
export function surfaceAt(x: number, y: number): { id: string; look: DragLook } | null {
  let best: { id: string; look: DragLook; area: number } | null = null
  for (const [id, { ref, look }] of registry) {
    const r = ref.current?.getBoundingClientRect()
    if (!r || x < r.left || x > r.right || y < r.top || y > r.bottom) continue
    const area = r.width * r.height
    if (!best || area < best.area) best = { id, look, area }
  }
  return best
}
