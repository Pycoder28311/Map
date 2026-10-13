import { useRef } from 'react'
import { useDragSurface } from '../../features/drag/surfaces'
import ObjectRow, { ObjectRowLook } from '../../features/objects/ObjectRow'
import OpenAsPanelButton from '../../features/workspace/OpenAsPanelButton'
import { findObject, isNoteLike } from '../../mocks/projects'
import { linksOf, useLinks, useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/**
 * Every note and article (top level and inside projects), as a simple list. Drag one onto a project or map in the
 * sidebar (their link nodes) or on the Dashboard to link it; onto a sidebar row to move it.
 */
export default function NotesPage() {
  const objects = useMockObjects()
  useLinks() // re-render when links change
  const notes = objects.filter((o) => isNoteLike(o.kind) && findObject(o.id))
  const listRef = useRef<HTMLUListElement>(null)
  // Over this list, a dragged object looks like one of its rows
  useDragSurface('notes-list', listRef, (item) => <ObjectRowLook label={item.label} icon={item.icon} />)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-24">
      <div>
        <h1 className="text-title">Notes</h1>
        <p className="text-body text-fg-muted">Drag a note onto a project or map to link it.</p>
      </div>
      {notes.length === 0 ? (
        <p className="text-body text-fg-muted">No notes yet. Create one with the + next to Notes in the sidebar.</p>
      ) : (
        <ul ref={listRef} className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id}>
              <ObjectRow
                object={note}
                icon={KIND_ICON[note.kind]}
                dragId={`notes-list:${note.id}`}
                panel={{ type: note.kind, id: note.id }}
                hint={note.parentId ? findObject(note.parentId)?.name : undefined}
                links={linksOf(note.id).length}
                end={<OpenAsPanelButton panel={{ type: note.kind, id: note.id }} />}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
