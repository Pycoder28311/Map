import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import { KIND_ICON } from '../../mocks/sidebarTree'
import LinkedList from '../links/LinkedList'
import type { PanelProps } from '../workspace/types'

/** One note or article: its title and text */
export default function NotePanel({ id }: PanelProps) {
  useMockObjects() // re-render on changes
  const note = findObject(id)
  if (!note) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  const Icon = KIND_ICON[note.kind]

  return (
    <div className="flex h-full min-h-48 flex-col gap-2 p-4">
      <h2 className="flex items-center gap-2 text-heading">
        <Icon className="size-5 text-fg-subtle" aria-hidden="true" />
        {note.name}
      </h2>
      {note.text ? (
        <p className="text-body whitespace-pre-wrap">{note.text}</p>
      ) : (
        <p className="text-body text-fg-muted">No text yet.</p>
      )}
      <LinkedList objectId={note.id} isNote title="Linked to" />
    </div>
  )
}
