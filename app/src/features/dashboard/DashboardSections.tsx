import { useDroppable } from '@dnd-kit/core'
import { useEffect, useRef, useState } from 'react'
import { findObject, KIND_LABEL, type MockObject, type ObjectKind } from '../../mocks/projects'
import { createObjectOf, deleteObject, getObjects, renameObject, useLinks, useMockObjects } from '../../mocks/projectsStore'
import { useTimeout } from '../../lib/useTimeout'
import NoteModal from '../notes/NoteModal'
import { clearSelected } from '../select/selectStore'
import { useObjectDrop } from '../drag/objectDrop'
import { useDragSurface } from '../drag/surfaces'
import { useLinkNode } from '../links/linkNode'
import { useOpenLayout } from '../objects/ListRows'
import { useObjectActions } from '../objects/useObjectActions'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import Card from './cards/Cards'
import { CARD_SIZE, COMMENT_SIZE, cardOf } from './cards/CardShell'
import { columnLabel, sectionsBelow, type ColumnId } from './columns'
import RowHeader from './RowHeader'
import { describeDrop, rowItems, rowParent, sortCards, type CardSort, type RowId } from './rows'
import { undoRowDrop, useCardFlip, useRowDrop, type RowTarget, type RowUndo } from './useRowDrop'
import { useRowReorder } from './useRowReorder'
import { useRowSort } from './useRowSort'
import { SectionCardLook } from './SectionCard'

/** How long the "Moved to…" note (with Undo) stays (ms) */
const NOTE_FOR = 6000

type Creatable = Exclude<ObjectKind, 'project'>
// A project's Create: no notes (they live in the Notes list), Orphans' also no maps (they live in projects);
// the Notes row creates notes only
const PROJECT_KINDS: Creatable[] = ['object', 'article', 'map', 'folder']
const ROOT_KINDS: Creatable[] = ['object', 'article', 'folder']
const NOTE_KINDS: Creatable[] = ['note']

type Props = {
  columns: ColumnId[]
  projects: { id: string; name: string }[]
}

type Note = { row: RowId; text: string; undo: RowUndo }

/**
 * Under the columns: Orphans (every top-level object that isn't a project), then a row per project,
 * each a strip of cards that scrolls sideways (one shown as a column, ⋯ on a column, isn't here).
 * A row's header renames a project in place, sorts its cards and creates new ones. Cards are dragged
 * to another place in their row, into another row, or into a folder card; a note then says where it
 * went, with Undo.
 */
export default function DashboardSections({ columns, projects }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const objects = useMockObjects()
  useLinks() // re-render when links change
  const linkNodeFor = useLinkNode()
  const actions = useObjectActions()
  const open = useOpenLayout()
  const { sortOf, setSort } = useRowSort()
  const { target } = useObjectDrop()
  const reorder = useRowReorder(
    rootRef,
    projects.map((p) => p.id),
  )
  const [note, setNote] = useState<Note | null>(null)
  const noteTimer = useTimeout()
  // A card just created: its name opens for editing
  const [created, setCreated] = useState<string | null>(null)
  // The note open in its modal
  const [noteId, setNoteId] = useState<string | null>(null)
  // Esc unticks the selected cards (a dialog or menu takes the Esc first)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && clearSelected()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const rows = sectionsBelow(
    columns,
    projects.map((p) => p.id),
  ) as RowId[]
  useBlockFlip(rootRef, 'sections', rows.join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  const visible = objects.filter((o) => findObject(o.id))
  const shown = (row: RowId) => sortCards(rowItems(visible, row), sortOf(row))
  const rowName = (row: RowId) => columnLabel(row as ColumnId, projects)

  useRowDrop({
    shownIds: (row) => shown(row).map((o) => o.id),
    sortOf,
    onDropped: (row, plan, id, undo) => {
      if (plan.kind !== 'into-folder' && undo.sort) setSort(row, null)
      // Its place in the row's (now manual) order
      const now = rowItems(
        getObjects().filter((o) => findObject(o.id)),
        row,
      )
      const place = now.findIndex((o) => o.id === id) + 1
      const folder = plan.kind === 'into-folder' ? findObject(plan.folderId)?.name : undefined
      setNote({ row, text: describeDrop(plan, { row: rowName(row), folder }, place), undo })
      noteTimer.set(() => setNote(null), NOTE_FOR)
    },
  })

  const undo = (n: Note) => {
    undoRowDrop(n.undo)
    setSort(n.undo.row, n.undo.sort)
    setNote(null)
  }

  const create = (row: RowId, kind: Creatable) => {
    const id = createObjectOf(kind, rowParent(row), `Untitled ${KIND_LABEL[kind].toLowerCase()}`, { first: true })
    if (!id) return
    setCreated(id)
    requestAnimationFrame(() => document.querySelector(`[data-card-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }))
  }

  const rowTarget = target?.zone === 'row-card' ? (target.value as RowTarget) : null

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-8">
      {rows.map((row) => {
        const projectId = rowParent(row)
        return (
          <section
            key={row}
            data-dash-block={row}
            data-project-row={projectId ?? undefined}
            aria-label={rowName(row)}
            className={`relative flex flex-col gap-3 transition-opacity ${projectId && reorder.dragging === projectId ? 'opacity-40' : ''}`}
          >
            {/* Where a row being moved would land: a line above this row (or below the last project row) */}
            {projectId && reorder.at?.beforeId === projectId && reorder.dragging !== projectId && (
              <div aria-hidden className="pointer-events-none absolute -top-4 inset-x-0 h-0.5 rounded-full bg-accent" />
            )}
            {projectId && reorder.at && reorder.at.beforeId === null && projectId === projects[projects.length - 1]?.id && reorder.dragging !== projectId && (
              <div aria-hidden className="pointer-events-none absolute -bottom-4 inset-x-0 h-0.5 rounded-full bg-accent" />
            )}
            <RowHeader
              name={rowName(row)}
              onRename={projectId ? (name) => renameObject(projectId, name) : undefined}
              onOpen={projectId ? () => open(single({ type: 'project', id: projectId })) : undefined}
              onGripDown={projectId ? reorder.start(projectId) : undefined}
              sort={sortOf(row)}
              onSort={(sort: CardSort | null) => setSort(row, sort)}
              creatable={row === 'notes' ? NOTE_KINDS : projectId ? PROJECT_KINDS : ROOT_KINDS}
              onCreate={(kind) => create(row, kind)}
              // Create names what it makes ("+ Note", "+ Article"…) everywhere but Orphans ("Create ▾")
              named={row !== 'orphans'}
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
                  onOpen={() => (o.kind === 'note' ? setNoteId(o.id) : open(single({ type: o.kind, id: o.id })))}
                  dropActive={rowTarget?.folderId === o.id}
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
      <NoteModal noteId={noteId} onClose={() => setNoteId(null)} />
    </div>
  )
}

type StripProps = {
  row: RowId
  items: MockObject[]
  /** Where a drag would land in this row (a gap opens there; a folder lights up instead) */
  target: RowTarget | null
  renderCard: (object: MockObject) => React.ReactNode
}

/** A row's cards, sideways: a drop target ('row-card' zone) where a gap opens for what's dragged over it */
function RowStrip({ row, items, target, renderCard }: StripProps) {
  const stripRef = useRef<HTMLDivElement | null>(null)
  // The Notes row takes no drops (every note is there already, wherever it is)
  const { setNodeRef } = useDroppable({ id: `dash-row:${row}`, data: { zone: 'row-card', priority: 2, row }, disabled: row === 'notes' })
  const size = row === 'notes' ? COMMENT_SIZE : CARD_SIZE
  const gapAt = target && !target.folderId ? (target.beforeId ? items.findIndex((o) => o.id === target.beforeId) : items.length) : -1
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
          {row === 'notes' ? 'No notes yet' : 'Nothing here yet'}
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
