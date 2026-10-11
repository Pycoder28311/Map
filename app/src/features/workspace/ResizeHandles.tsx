import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from 'react'
import { moveSplit, resetSplit, segmentValue, SEGMENT_VAR, splitFor, splitSegments, type SplitSegment, type Template } from './layout'
import { clamp, type Split } from './split'
import { useSplitDrag, type SplitAxis } from './useSplitDrag'

type Props = {
  template: Template
  /** The grid element: its split variables change while dragging */
  containerRef: RefObject<HTMLDivElement | null>
  split: Split
  /** Called once when a drag or key press ends (saves the sizes) */
  onCommit: (split: Split) => void
}

const STEP = 0.05
const HANDLE =
  'absolute z-10 rounded-full transition-colors duration-150 hover:bg-fg-subtle/40 active:bg-fg-subtle/60 ' +
  'focus-visible:bg-fg-subtle/60 focus-visible:outline-none max-lg:hidden'

// Full class strings so Tailwind can detect them at build time.
/** Each segment is a `peer` for the swap buttons on it (SwapButtons shows them while it's hovered) */
const SEGMENT_PEER: Record<SplitSegment['id'], string> = {
  x: 'peer/x',
  'x-top': 'peer/xt',
  'x-bottom': 'peer/xb',
  y: 'peer/y',
  'y-left': 'peer/yl',
  'y-right': 'peer/yr',
}

const LABEL: Record<SplitSegment['id'], string> = {
  x: 'Resize columns',
  'x-top': 'Resize the top two panes',
  'x-bottom': 'Resize the bottom two panes',
  y: 'Resize rows',
  'y-left': 'Resize the left two panes',
  'y-right': 'Resize the right two panes',
}

/** Where a segment lies: on its line, over its part (a half ends where the other line crosses) */
function segmentStyle({ id, axis, part }: SplitSegment): CSSProperties {
  const at = SEGMENT_VAR[id]
  const cross = axis === 'x' ? 'var(--split-y)' : 'var(--split-x)'
  const from = part === 'end' ? cross : 0
  const to = part === 'start' ? `calc(100% - ${cross})` : 0
  return axis === 'x'
    ? { left: `calc(${at} - var(--resize-handle) / 2)`, width: 'var(--resize-handle)', top: from, bottom: to }
    : { top: `calc(${at} - var(--resize-handle) / 2)`, height: 'var(--resize-handle)', left: from, right: to }
}

/**
 * Resize handles: each line, or (2×2) each half of a line, and, where the lines cross, the corner
 * (both at once). Dragging a half moves only the two panes beside it; it snaps back to its partner
 * when close (layout.ts: moveSplit). The drag itself: useSplitDrag (shared with the swap buttons).
 */
export default function ResizeHandles({ template, containerRef, split: raw, onCommit }: Props) {
  const split = splitFor(template, raw)
  const { segments, corner } = splitSegments(template, split)
  const { start, move, end: stop, apply } = useSplitDrag({ template, containerRef, split, onCommit })

  const commit = (next: Split) => {
    const fitted = splitFor(template, next)
    apply(fitted)
    onCommit(fitted)
  }

  const onKeyDown = (axis: SplitAxis) => (e: KeyboardEvent<HTMLDivElement>) => {
    const dx = axis.startsWith('y') ? 0 : (({ ArrowLeft: -STEP, ArrowRight: STEP } as Record<string, number>)[e.key] ?? 0)
    const dy = axis.startsWith('x') && axis !== 'xy' ? 0 : (({ ArrowUp: -STEP, ArrowDown: STEP } as Record<string, number>)[e.key] ?? 0)
    if (!dx && !dy) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    const x = axis === 'x-bottom' ? (split.x2 ?? split.x) : split.x
    const y = axis === 'y-right' ? (split.y2 ?? split.y) : split.y
    commit(moveSplit(split, axis, { x: clamp(x + dx), y: clamp(y + dy) }, rect ?? { width: 0, height: 0 }))
  }

  const handlers = (axis: SplitAxis) => ({
    tabIndex: 0,
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => start(axis, e),
    onPointerMove: move,
    onPointerUp: stop,
    onPointerCancel: stop,
    onKeyDown: onKeyDown(axis),
    onDoubleClick: () => commit(resetSplit(split, axis)),
  })

  const cornerStyle: CSSProperties = {
    left: 'calc(var(--split-x) - var(--resize-corner) / 2)',
    top: 'calc(var(--split-y) - var(--resize-corner) / 2)',
    width: 'var(--resize-corner)',
    height: 'var(--resize-corner)',
  }

  return (
    <>
      {segments.map((seg) => (
        <div
          key={seg.id}
          role="separator"
          aria-orientation={seg.axis === 'x' ? 'vertical' : 'horizontal'}
          aria-label={LABEL[seg.id]}
          aria-valuenow={Math.round(segmentValue(split, seg.id) * 100)}
          // A peer: the swap buttons on this segment show while it's hovered (SwapButtons)
          className={`${SEGMENT_PEER[seg.id]} ${HANDLE} ${seg.axis === 'x' ? 'cursor-col-resize' : 'cursor-row-resize'}`}
          style={segmentStyle(seg)}
          {...handlers(seg.id)}
        />
      ))}
      {corner && (
        <div role="separator" aria-label="Resize columns and rows" className={`${HANDLE} z-20 cursor-move`} style={cornerStyle} {...handlers('xy')} />
      )}
    </>
  )
}
