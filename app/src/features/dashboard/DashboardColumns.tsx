import { useDraggable } from '@dnd-kit/core'
import { useRef } from 'react'
import { LuEllipsis, LuGripVertical } from 'react-icons/lu'
import Dropdown from '../../components/ui/overlays/Dropdown'
import { ObjectRowLook } from '../objects/ObjectRow'
import { useDragSurface } from '../drag/surfaces'
import type { PanelDragData } from '../workspace/types'
import { useBlockFlip } from './blockFlip'
import ColumnBody from './ColumnBodies'
import { DASHBOARD_COLUMNS_FADE_START, DASHBOARD_COLUMNS_OVERLAY_OPACITY } from './DashboardBackground'
import { columnLabel, menuEntries, type ColumnId } from './columns'
import { useColumnDrag } from './useColumnDrag'
import type { useDashboardColumns } from './useDashboardColumns'

// Full class strings so Tailwind can detect them at build time.
// The grip: shown while the column's header is hovered or holds focus (always while dragging)
const GRIP =
  'inline-flex shrink-0 cursor-grab items-center justify-center rounded-(--btn-close-radius) p-0.5 text-fg-subtle ' +
  'opacity-0 transition-opacity group-hover/col:opacity-100 focus-visible:opacity-100 hover:text-fg active:cursor-grabbing ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

type Columns = ReturnType<typeof useDashboardColumns>

/**
 * The Dashboard's three columns (Cloudflare-homepage style): each a label and a list. On the label:
 * a grip on the left (drag the column to another place; the others make room) and ⋯ on the right
 * (show another list here: one already in a column trades places; a section from below moves up).
 * Stacked on narrow screens.
 */
export default function DashboardColumns({ columns, pick, move }: Columns) {
  const rootRef = useRef<HTMLDivElement>(null)
  const { shown, draggingIndex } = useColumnDrag(rootRef, columns, move)
  useBlockFlip(rootRef, 'columns', shown.join(','))
  // Over the columns, a dragged object looks like one of their rows
  useDragSurface('dash-columns', rootRef, (item) => <ObjectRowLook label={item.label} icon={item.icon} className="w-64" />)

  return (
    <div
      ref={rootRef}
      data-flip-root="columns"
      // Their own background: the page's dark layer made smoothly darker around them, fading out towards the edges of this box, which reaches
      // 5rem past the columns on each side (the padding, taken back by the negative margins: nothing moves)
      style={{ backgroundImage: `radial-gradient(ellipse at center, rgb(0 0 0 / ${DASHBOARD_COLUMNS_OVERLAY_OPACITY}) ${DASHBOARD_COLUMNS_FADE_START}%, rgb(0 0 0 / 0) 100%)` }}
      className="-mx-20 -my-16 grid gap-lg px-20 py-16 md:grid-cols-3"
    >
      {shown.map((id, slot) => (
        // Keyed by column, so a dragged one stays the same element while the others make room;
        // data-column-slot: its place, measured when a drag starts (useColumnDrag)
        <div key={id} data-column-slot={slot} className="min-w-0">
          <Column
            id={id}
            index={columns.indexOf(id)}
            label={columnLabel(id)}
            entries={menuEntries(columns, columns.indexOf(id))}
            onPick={(choice) => pick(columns.indexOf(id), choice)}
            dragging={draggingIndex === columns.indexOf(id)}
          />
        </div>
      ))}
    </div>
  )
}

type ColumnProps = {
  id: ColumnId
  /** Its place in the saved order */
  index: number
  label: string
  entries: ReturnType<typeof menuEntries>
  onPick: (choice: ColumnId) => void
  dragging: boolean
}

function Column({ id, index, label, entries, onPick, dragging }: ColumnProps) {
  const data: PanelDragData = { kind: 'column', index, label }
  const { setNodeRef, listeners, attributes } = useDraggable({ id: `column:${id}`, data })

  return (
    <section data-dash-block={id} aria-label={label} className={`group/col flex flex-col gap-1 transition-opacity ${dragging ? 'opacity-40' : ''}`}>
      <header className="flex items-center gap-1 border-b border-line pb-1">
        <button
          ref={setNodeRef}
          type="button"
          data-drag-handle
          {...listeners}
          {...attributes}
          aria-label={`Move ${label}`}
          title="Drag to move"
          className={`${GRIP} ${dragging ? 'opacity-100' : ''}`}
        >
          <LuGripVertical className="size-(--btn-icon-size)" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-body font-medium text-fg-muted">{label}</h2>
        <Dropdown
          label={`Show instead of ${label}`}
          triggerIcon={LuEllipsis}
          value={id}
          onChange={onPick}
          options={entries.map((e) => ({
            value: e.id,
            label: e.label,
            disabled: e.current,
            hint: e.inColumn ? `column ${e.inColumn}` : undefined,
          }))}
        />
      </header>
      <ColumnBody id={id} />
    </section>
  )
}
