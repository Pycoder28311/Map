import { useDraggable } from '@dnd-kit/core'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import type { SavedLayout } from '../../mocks/layoutsStore'
import type { PanelDragData } from '../workspace/types'
import { layoutLines } from './geometry'
import LayoutHoverLabels from './LayoutHoverLabels'

/** Rest this long on a tile before its labels show (ms) */
const LABELS_DELAY = 200

type Props = {
  layout: Pick<SavedLayout, 'id' | 'template' | 'split'>
  /** Each pane's name, in slot order (for the labels and the button's name) */
  names: string[]
  onOpen?: () => void
  /** The layout last opened from its tile */
  selected?: boolean
  /** Some of its panels no longer exist */
  missing?: boolean
  /** Can be dragged (onto the trash). The drag id comes from `layout.id`: give copies (previews) their own */
  draggable?: boolean
  /** Hover labels (off in the rail, where tiles are tiny) */
  labels?: boolean
  style?: CSSProperties
  className?: string
}

/**
 * A saved layout as a small 16:9 tile: thin lines show where its panes are. Hover (or keyboard
 * focus): each pane's name floats next to its part of the tile. Click: open it.
 */
export default function LayoutThumb({
  layout,
  names,
  onOpen,
  selected = false,
  missing = false,
  draggable = false,
  labels = true,
  style,
  className = '',
}: Props) {
  const data: PanelDragData = { kind: 'layout', layoutId: layout.id, label: names.join(' · ') || 'Layout' }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `layout:${layout.id}`, data, disabled: !draggable })
  // The tile's element, for the labels' positions
  const [tile, setTile] = useState<HTMLButtonElement | null>(null)
  const setRef = useCallback(
    (el: HTMLButtonElement | null) => {
      setNodeRef(el)
      setTile(el)
    },
    [setNodeRef],
  )
  const [showLabels, setShowLabels] = useState(false)
  const timer = useRef<number>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])
  const show = () => {
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setShowLabels(true), LABELS_DELAY)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setShowLabels(false)
  }

  return (
    <>
      <button
        ref={setRef}
        type="button"
        {...(draggable ? { ...listeners, ...attributes } : {})}
        data-layout-tile={layout.id}
        onClick={onOpen}
        onPointerEnter={(e) => e.pointerType === 'mouse' && show()}
        onPointerLeave={hide}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && show()}
        onBlur={hide}
        aria-label={`Layout: ${names.join(', ')}${missing ? ' (some panes are missing)' : ''}`}
        aria-pressed={selected}
        style={style}
        className={`cursor-pointer overflow-hidden rounded-(--btn-radius) border bg-surface text-fg-subtle transition-[background-color,border-color,left,top,width,height] duration-(--sidebar-duration) ease-out hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
          selected ? 'border-drop ring-2 ring-drop/40' : 'border-line-strong'
        } ${missing ? 'border-dashed opacity-60' : ''} ${isDragging ? 'opacity-40' : ''} ${className}`}
      >
        <svg viewBox="0 0 16 9" preserveAspectRatio="none" aria-hidden className="block size-full">
          {layoutLines(layout.template, layout.split).map((l, i) => (
            <line
              key={i}
              x1={l.x1 * 16}
              y1={l.y1 * 9}
              x2={l.x2 * 16}
              y2={l.y2 * 9}
              stroke="currentColor"
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </button>
      {labels && showLabels && !isDragging && tile && names.length > 0 && (
        <LayoutHoverLabels tile={tile} template={layout.template} split={layout.split} names={names} />
      )}
    </>
  )
}
