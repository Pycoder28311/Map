import { useRef, type PointerEvent, type RefObject } from 'react'
import { moveSplit, splitFor, type SplitAxis, type Template } from './layout'
import { clamp, percent, type Split } from './split'

export type { SplitAxis }

type Options = {
  template: Template
  /** The grid element: its --split-x / --split-y (and --split-x2 / --split-y2) change while dragging */
  containerRef: RefObject<HTMLDivElement | null>
  split: Split
  /** Called once when a drag ends (saves the sizes; halves that met are stored joined) */
  onCommit: (split: Split) => void
}

/** Shows a split on the grid through its CSS variables (a missing half: its variable is removed) */
export function applySplit(el: HTMLElement | null, split: Split) {
  if (!el) return
  el.style.setProperty('--split-x', percent(split.x))
  el.style.setProperty('--split-y', percent(split.y))
  if (split.x2 === undefined) el.style.removeProperty('--split-x2')
  else el.style.setProperty('--split-x2', percent(split.x2))
  if (split.y2 === undefined) el.style.removeProperty('--split-y2')
  else el.style.setProperty('--split-y2', percent(split.y2))
}

/**
 * Dragging the workspace's lines, shared by the resize handles and the swap buttons on them: a whole
 * line, one half of a line (2×2: only the two panes beside it move, snapping back when close to its
 * partner), or the corner. While dragging only CSS variables change: no React render. Spread `move`
 * / `end` on the element that calls `start` (it captures the pointer).
 */
export function useSplitDrag({ template, containerRef, split, onCommit }: Options) {
  const live = useRef(split)
  const drag = useRef<{ axis: SplitAxis; rect: DOMRect; from: Split } | null>(null)

  const apply = (next: Split) => {
    live.current = next
    applySplit(containerRef.current, next)
  }

  const start = (axis: SplitAxis, e: PointerEvent<Element>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    live.current = split // start from the saved position
    drag.current = { axis, rect, from: split }
  }

  const move = (e: PointerEvent<Element>) => {
    if (!drag.current) return
    const { axis, rect, from } = drag.current
    const to = { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) }
    apply(moveSplit(from, axis, to, rect))
  }

  const end = () => {
    if (!drag.current) return
    drag.current = null
    onCommit(splitFor(template, live.current))
  }

  return { start, move, end, apply, isDragging: () => drag.current !== null }
}
