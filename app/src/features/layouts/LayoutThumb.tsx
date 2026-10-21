import { useDraggable } from '@dnd-kit/core'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { PlainIcon } from '../../components/ui/icons/IconSlot'
import type { SavedLayout } from './layoutsStore'
import type { PanelDragData } from '../workspace/types'
import { layoutLines } from './geometry'
import LayoutHoverLabels from './LayoutHoverLabels'

/** Rest this long on a tile before its labels show (ms) */
const LABELS_DELAY = 200

// Full class strings so Tailwind can detect them at build time.
const LOOK = {
  // A saved layout; selected: the one last opened from its tile
  saved: { border: 'border-line-strong', selected: 'border-drop ring-2 ring-drop/40', lines: 'text-fg-subtle' },
  // The panes on screen, not saved yet: blue, with fainter blue lines
  unsaved: { border: 'border-highlight', selected: 'border-highlight', lines: 'text-highlight/50' },
}

// The action buttons: centred on the tile's top edge, shown while it's hovered or holds focus
const ACTIONS = 'absolute start-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 gap-1 transition-opacity duration-150'
const ACTIONS_ON_HOVER = 'opacity-0 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100'

type Props = {
  layout: Pick<SavedLayout, 'id' | 'template' | 'split'>
  /** Each pane's name, in slot order (for the labels and the button's name) */
  names: string[]
  onOpen?: () => void
  /** The layout last opened from its tile */
  selected?: boolean
  /** Some of its panels no longer exist */
  missing?: boolean
  /** saved, or the panes on screen not saved yet */
  variant?: 'saved' | 'unsaved'
  /** Small buttons on its top edge (TileAction), shown on hover; always for an unsaved tile */
  actions?: ReactNode
  /** Can be dragged (onto the trash). The drag id comes from `layout.id`: give copies (previews) their own */
  draggable?: boolean
  /** Hover labels (off in the rail, where tiles are tiny) */
  labels?: boolean
  /** Placement and size of the whole tile (e.g. absolute, from tileGrid) */
  style?: CSSProperties
  className?: string
}

/**
 * A layout as a small 16:9 tile: thin lines show where its panes are. Hover (or keyboard focus):
 * each pane's name floats next to its part of the tile, and its actions show on its top edge.
 * Click: open it.
 */
export default function LayoutThumb({
  layout,
  names,
  onOpen,
  selected = false,
  missing = false,
  variant = 'saved',
  actions,
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
  const look = LOOK[variant]

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
    <div style={style} className={`group/tile ${className}`}>
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
        aria-label={`${variant === 'unsaved' ? 'Unsaved layout' : 'Layout'}: ${names.join(', ')}${missing ? ' (some panes are missing)' : ''}`}
        aria-pressed={variant === 'saved' ? selected : undefined}
        className={`block size-full cursor-pointer overflow-hidden rounded-(--btn-radius) border bg-surface transition-[background-color,border-color] duration-150 ease-out hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none ${
          selected ? look.selected : look.border
        } ${look.lines} ${missing ? 'border-dashed opacity-60' : ''} ${isDragging ? 'opacity-40' : ''}`}
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
      {actions && !isDragging && <div className={`${ACTIONS} ${variant === 'unsaved' ? '' : ACTIONS_ON_HOVER}`}>{actions}</div>}
      {labels && showLabels && !isDragging && tile && names.length > 0 && (
        <LayoutHoverLabels tile={tile} template={layout.template} split={layout.split} names={names} />
      )}
    </div>
  )
}

/** A small round button on a tile's top edge (LayoutThumb's `actions`) */
export function TileAction({
  icon: Icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: PlainIcon
  label: string
  onClick: () => void
  tone?: 'default' | 'highlight' | 'danger'
}) {
  const colour = { default: 'text-fg', highlight: 'text-highlight', danger: 'text-danger' }[tone]
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-6 cursor-pointer items-center justify-center rounded-(--radius-pill) border border-line bg-surface shadow-sm transition-colors hover:bg-fill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${colour}`}
    >
      <Icon className="size-3.5" />
    </button>
  )
}
