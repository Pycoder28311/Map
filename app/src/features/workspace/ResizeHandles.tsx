import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type RefObject } from 'react'
import { splitLines, type Template } from './layout'
import { clamp, percent, type Split } from './split'

type Axis = 'x' | 'y' | 'xy'

type Props = {
  template: Template
  /** The grid element: its --split-x / --split-y change while dragging */
  containerRef: RefObject<HTMLDivElement | null>
  split: Split
  /** Called once when a drag or key press ends (saves the sizes) */
  onCommit: (split: Split) => void
}

const STEP = 0.05
const HANDLE =
  'absolute z-10 rounded-full transition-colors duration-150 hover:bg-fg-subtle/40 active:bg-fg-subtle/60 ' +
  'focus-visible:bg-fg-subtle/60 focus-visible:outline-none max-lg:hidden'

/**
 * Resize handles: the vertical line (x), the horizontal line (y) and, where they meet, the corner
 * (both at once; every panel adjusts). While dragging only CSS variables change: no React render.
 */
export default function ResizeHandles({ template, containerRef, split, onCommit }: Props) {
  const lines = splitLines(template)
  const hasX = lines.x.top || lines.x.bottom
  const hasY = lines.y.left || lines.y.right
  const live = useRef(split)
  const drag = useRef<{ axis: Axis; rect: DOMRect } | null>(null)

  const apply = (next: Split) => {
    live.current = next
    containerRef.current?.style.setProperty('--split-x', percent(next.x))
    containerRef.current?.style.setProperty('--split-y', percent(next.y))
  }

  const onPointerDown = (axis: Axis) => (e: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    live.current = split // start from the saved position
    drag.current = { axis, rect }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    const { axis, rect } = drag.current
    apply({
      x: axis === 'y' ? live.current.x : clamp((e.clientX - rect.left) / rect.width),
      y: axis === 'x' ? live.current.y : clamp((e.clientY - rect.top) / rect.height),
    })
  }
  const onPointerUp = () => {
    if (!drag.current) return
    drag.current = null
    onCommit(live.current)
  }
  const onKeyDown = (axis: Axis) => (e: KeyboardEvent<HTMLDivElement>) => {
    const dx = axis !== 'y' ? ({ ArrowLeft: -STEP, ArrowRight: STEP } as Record<string, number>)[e.key] ?? 0 : 0
    const dy = axis !== 'x' ? ({ ArrowUp: -STEP, ArrowDown: STEP } as Record<string, number>)[e.key] ?? 0 : 0
    if (!dx && !dy) return
    e.preventDefault()
    const next = { x: clamp(split.x + dx), y: clamp(split.y + dy) }
    apply(next)
    onCommit(next)
  }
  const reset = (axis: Axis) => () => {
    const next = { x: axis === 'y' ? split.x : 0.5, y: axis === 'x' ? split.y : 0.5 }
    apply(next)
    onCommit(next)
  }

  const handlers = (axis: Axis) => ({
    tabIndex: 0,
    onPointerDown: onPointerDown(axis),
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    onKeyDown: onKeyDown(axis),
    onDoubleClick: reset(axis),
  })

  // A line only spans the part of the grid where it actually separates panels
  const xStyle: CSSProperties = {
    left: 'calc(var(--split-x) - var(--resize-handle) / 2)',
    width: 'var(--resize-handle)',
    top: lines.x.top ? 0 : 'var(--split-y)',
    bottom: lines.x.bottom ? 0 : 'calc(100% - var(--split-y))',
  }
  const yStyle: CSSProperties = {
    top: 'calc(var(--split-y) - var(--resize-handle) / 2)',
    height: 'var(--resize-handle)',
    left: lines.y.left ? 0 : 'var(--split-x)',
    right: lines.y.right ? 0 : 'calc(100% - var(--split-x))',
  }
  const cornerStyle: CSSProperties = {
    left: 'calc(var(--split-x) - var(--resize-corner) / 2)',
    top: 'calc(var(--split-y) - var(--resize-corner) / 2)',
    width: 'var(--resize-corner)',
    height: 'var(--resize-corner)',
  }

  return (
    <>
      {hasX && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize columns"
          aria-valuenow={Math.round(split.x * 100)}
          // peer/x: the swap buttons on this line show while it's hovered (SwapButtons)
          className={`peer/x ${HANDLE} cursor-col-resize`}
          style={xStyle}
          {...handlers('x')}
        />
      )}
      {hasY && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize rows"
          aria-valuenow={Math.round(split.y * 100)}
          className={`peer/y ${HANDLE} cursor-row-resize`}
          style={yStyle}
          {...handlers('y')}
        />
      )}
      {hasX && hasY && (
        <div
          role="separator"
          aria-label="Resize columns and rows"
          className={`${HANDLE} z-20 cursor-move`}
          style={cornerStyle}
          {...handlers('xy')}
        />
      )}
    </>
  )
}
