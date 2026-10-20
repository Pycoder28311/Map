import { useDroppable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import { KIND_LABEL, type MockObject, type ObjectKind } from '../../mocks/projects'
import { createObjectOf, deleteObject, getObjects, useLinks, useMockObjects } from '../../mocks/projectsStore'
import { useTimeout } from '../../lib/useTimeout'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { clearSelected } from '../select/selectStore'
import { useObjectDrop } from '../drag/objectDrop'
import { useDragSurface } from '../drag/surfaces'
import { useLinkNode } from '../links/linkNode'
import { useOpenLayout } from '../objects/ListRows'
import { useObjectActions } from '../objects/useObjectActions'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import Card from './cards/Cards'
import { CARD_SIZE, cardOf } from './cards/CardShell'
import { columnLabel, RESOURCE_COLUMNS, sectionsBelow, type ColumnId } from './columns'
import RowHeader from './RowHeader'
import { describeDrop, rowItems, sortCards, type CardSort, type RowId } from './rows'
import { undoRowDrop, useCardFlip, useRowDrop, type RowTarget, type RowUndo } from './useRowDrop'
import { useRowSort } from './useRowSort'
import { SectionCardLook } from './SectionCard'
import ResourceSection from './ResourceSection'

/** How long the "Moved to…" note (with Undo) stays (ms) */
const NOTE_FOR = 6000

// What the Objects row's Create offers
const OBJECT_KINDS: ObjectKind[] = ['object', 'map']

type Props = {
  columns: ColumnId[]
}

type Note = { row: RowId; text: string; undo: RowUndo }

/**
 * Under the columns: Projects and Notes (the server's items, a strip of cards each) and Objects (the mock maps and object cards),
 * each a strip of cards that scrolls sideways (one shown as a column, ⋯ on a column, isn't here).
 * A row's header sorts its cards and creates new ones. Object cards are dragged to another place in their row; a note then says where it
 * went, with Undo.
 */
export default function DashboardSections({ columns }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const objects = useMockObjects()
  useLinks() // re-render when links change
  const linkNodeFor = useLinkNode()
  const actions = useObjectActions()
  const open = useOpenLayout()
  const { sortOf, setSort } = useRowSort()
  const { target } = useObjectDrop()
  const [note, setNote] = useState<Note | null>(null)
  const noteTimer = useTimeout()
  // A card just created: its name opens for editing
  const [created, setCreated] = useState<string | null>(null)
  // The project or note open in its modal
  const [editing, setEditing] = useState<{ resource: AnyResource; id: string } | null>(null)
  // Esc unticks the selected cards (a dialog or menu takes the Esc first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && clearSelected()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const rows = sectionsBelow(columns) as RowId[]
  useBlockFlip(rootRef, 'sections', rows.join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  const visible = objects.filter((o) => !o.archived)
  const shown = (row: RowId) => sortCards(rowItems(visible, row), sortOf(row))

  useRowDrop({
    shownIds: (row) => shown(row).map((o) => o.id),
    sortOf,
    onDropped: (row, _plan, id, undo) => {
      if (undo.sort) setSort(row, null)
      // Its place in the row's (now manual) order
      const place = rowItems(getObjects().filter((o) => !o.archived), row).findIndex((o) => o.id === id) + 1
      setNote({ row, text: describeDrop(place), undo })
      noteTimer.set(() => setNote(null), NOTE_FOR)
    },
  })

  const undo = (n: Note) => {
    undoRowDrop(n.undo)
    setSort(n.undo.row, n.undo.sort)
    setNote(null)
  }

  const create = (kind: ObjectKind) => {
    const id = createObjectOf(kind, `Untitled ${KIND_LABEL[kind].toLowerCase()}`, { first: true })
    setCreated(id)
    requestAnimationFrame(() => document.querySelector(`[data-card-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  }

  const rowTarget = target?.zone === 'row-card' ? (target.value as RowTarget) : null

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-8">
      {rows.map((row) => {
        // A resource's row (Projects, Notes): its own section, from the server
        const resourceName = RESOURCE_COLUMNS[row as ColumnId]
        const resource = resourceName ? resourceByName(resourceName) : undefined
        if (resource) return <ResourceSection key={row} resource={resource} row={row as 'projects' | 'notes'} onOpen={(id) => setEditing({ resource, id })} />
        return (
          <section
            key={row}
            data-dash-block={row}
            aria-label={columnLabel(row)}
            className="relative flex flex-col gap-3 transition-opacity"
          >
            <RowHeader
              name={columnLabel(row)}
              sort={sortOf(row)}
              onSort={(sort: CardSort | null) => setSort(row, sort)}
              creatable={OBJECT_KINDS}
              onCreate={create}
            />
            {note?.row === row && (
              <p role="status" className="flex items-center gap-2 self-start rounded-(--radius-pill) bg-fill px-3 py-1 text-small text-fg-muted">
                {note.text}
                <button type="button" onClick={() => undo(note)} className="cursor-pointer font-medium text-fg underline-offset-2 hover:underline">
                  Undo
                </button>
              </p>
            )}
            <RowStrip
              row={row}
              items={shown(row)}
              target={rowTarget?.row === row ? rowTarget : null}
              renderCard={(o) => (
                <Card
                  object={o}
                  linkNodeFor={linkNodeFor}
                  onOpen={() => open(single({ type: o.kind, id: o.id }))}
                  renameOnMount={o.id === created}
                  // A just-created element: Cancel removes it, Create keeps it
                  pending={o.id === created ? { onCancel: () => (deleteObject(o.id), setCreated(null)), onCreate: () => setCreated(null) } : undefined}
                  menu={(onRename) =>
                    actions.menuOf(o, {
                      panel: { type: o.kind, id: o.id },
                      onRename,
                      element: () => document.querySelector(`[data-card-id="${CSS.escape(o.id)}"]`),
                    })
                  }
                />
              )}
            />
          </section>
        )
      })}
      {actions.dialogs}
      {editing && <ResourceModal resource={editing.resource} itemId={editing.id} onClose={() => setEditing(null)} />}
    </div>
  )
}

type StripProps = {
  row: RowId
  items: MockObject[]
  /** Where a drag would land in this row (a gap opens there) */
  target: RowTarget | null
  renderCard: (object: MockObject) => React.ReactNode
}

/** A row's cards, sideways: a drop target ('row-card' zone) where a gap opens for what's dragged over it */
function RowStrip({ row, items, target, renderCard }: StripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const { setNodeRef } = useDroppable({ id: `dash-row:${row}`, data: { zone: 'row-card', priority: 2, row } })
  const size = CARD_SIZE
  const gapAt = target ? (target.beforeId ? items.findIndex((o) => o.id === target.beforeId) : items.length) : -1
  const slots: (MockObject | 'gap')[] = [...items]
  if (gapAt >= 0) slots.splice(gapAt, 0, 'gap')
  useCardFlip(stripRef, slots.map((s) => (s === 'gap' ? 'gap' : s.id)).join(','))

  return (
    <div
      ref={(el) => {
        stripRef.current = el
        setNodeRef(el)
      }}
      data-row-strip={row}
      className="-mx-2 flex min-h-56 snap-x gap-3 overflow-x-auto px-2 pt-1 pb-3"
    >
      {slots.length === 0 ? (
        <p className={`${cardOf(size)} items-center justify-center border border-dashed border-line-strong text-body text-fg-subtle shadow-none ring-0`}>
          Nothing here yet
        </p>
      ) : (
        slots.map((slot) =>
          slot === 'gap' ? (
            <div key="gap" data-flip-card="gap" aria-hidden className={`${cardOf(size)} border-2 border-dashed border-drop/60 bg-drop/5 shadow-none ring-0`} />
          ) : (
            <div key={slot.id} data-flip-card={slot.id} className="shrink-0">
              {renderCard(slot)}
            </div>
          ),
        )
      )}
    </div>
  )
}
