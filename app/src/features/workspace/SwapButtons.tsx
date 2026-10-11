import { useRef, type CSSProperties, type PointerEvent, type RefObject } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import { iconButtonClass } from '../../components/ui/buttons/buttonStyles'
import { borders, SEGMENT_VAR, segmentOf, splitFor, type SplitSegment, type Slot, type Template } from './layout'
import type { Split } from './split'
import { useSplitDrag } from './useSplitDrag'

type Props = {
  template: Template
  /** The two panels on its sides trade places */
  onSwap: (a: Slot, b: Slot) => void
  /** Dragging a button moves its line, like the line itself (ResizeHandles) */
  containerRef: RefObject<HTMLDivElement | null>
  split: Split
  onCommit: (split: Split) => void
}

/** A press that moves this far (px) resizes instead of swapping */
const DRAG_START = 4

// Full class strings so Tailwind can detect them at build time.
// Shown while its line is hovered or focused (the line is a `peer` before it, ResizeHandles), or
// while the pointer / keyboard focus is on the button itself. Wide screens only, like the lines.
const BUTTON =
  'group/swap absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none border border-line bg-surface-sunken shadow-md ' +
  'opacity-0 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 max-lg:hidden'
// One per segment (ResizeHandles' SEGMENT_PEER), so a button shows with its own half
const SHOW: Record<SplitSegment['id'], string> = {
  x: 'peer-hover/x:opacity-100 peer-focus-visible/x:opacity-100',
  'x-top': 'peer-hover/xt:opacity-100 peer-focus-visible/xt:opacity-100',
  'x-bottom': 'peer-hover/xb:opacity-100 peer-focus-visible/xb:opacity-100',
  y: 'peer-hover/y:opacity-100 peer-focus-visible/y:opacity-100',
  'y-left': 'peer-hover/yl:opacity-100 peer-focus-visible/yl:opacity-100',
  'y-right': 'peer-hover/yr:opacity-100 peer-focus-visible/yr:opacity-100',
}
// While held, the cursor says it can resize
const HELD = { x: 'active:cursor-col-resize', y: 'active:cursor-row-resize' }
// The two arrows turn half a turn on hover: the two panels rotate into each other's place
const ICON = 'size-(--btn-icon-size) transition-[rotate] duration-300 ease-out group-hover/swap:rotate-180 motion-reduce:transition-none'
// Round, like the panels' island
const ROUND = { '--btn-close-radius': '9999px' } as CSSProperties

/** Where along the line the middle of a border is */
const MIDDLE = {
  start: 'calc(var(--split) / 2)',
  end: 'calc((var(--split) + 100%) / 2)',
  whole: '50%',
}

/**
 * A small button in the middle of each border between panels (borders in layout.ts), shown while
 * the border is hovered. Click: the two panels on its sides trade places (the layout and sizes stay,
 * so it looks like their contents swap). Press and drag: moves the border, like the line itself.
 */
export default function SwapButtons({ template, onSwap, containerRef, split: raw, onCommit }: Props) {
  const split = splitFor(template, raw)
  const drag = useSplitDrag({ template, containerRef, split, onCommit })
  const press = useRef<{ x: number; y: number } | null>(null)

  return borders(template).map(({ axis, part, slots }) => {
    // x line: runs down at --split-x, its halves split by --split-y (and the other way round)
    const along = MIDDLE[part].replace('--split', axis === 'x' ? '--split-y' : '--split-x')
    // The segment it sits on (a half of the line in a 2×2 layout), at that segment's position
    const segment = segmentOf(template, split, { axis, part })
    const position: CSSProperties =
      axis === 'x' ? { left: SEGMENT_VAR[segment], top: along } : { top: SEGMENT_VAR[segment], left: along }
    const label = axis === 'x' ? 'Swap left and right (drag to resize)' : 'Swap top and bottom (drag to resize)'

    const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return
      press.current = { x: e.clientX, y: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
      if (drag.isDragging()) return drag.move(e)
      const from = press.current
      if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) >= DRAG_START) {
        press.current = null
        drag.start(segment, e)
        drag.move(e)
      }
    }
    const onPointerUp = () => {
      if (drag.isDragging()) drag.end()
      else if (press.current) onSwap(...slots) // a press without moving: swap
      press.current = null
    }

    return (
      <button
        key={`${axis}-${part}`}
        type="button"
        aria-label={label}
        title={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.end()
          press.current = null
        }}
        // Keyboard (Enter / Space): swap. Pointer clicks are handled on pointer up
        onClick={(e) => e.detail === 0 && onSwap(...slots)}
        style={{ ...ROUND, ...position }}
        className={iconButtonClass('ghost', `${BUTTON} ${SHOW[segment]} ${HELD[axis]}`)}
      >
        <LuRefreshCw className={ICON} />
      </button>
    )
  })
}
