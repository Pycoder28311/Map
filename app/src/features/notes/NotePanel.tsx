import { LuStickyNote } from 'react-icons/lu'
import { findObject } from '../../mocks/projects'
import { useMockObjects } from '../../mocks/projectsStore'
import type { PanelProps } from '../workspace/types'

/** One note (placeholder until notes have text) */
export default function NotePanel({ id }: PanelProps) {
  useMockObjects() // re-render on changes
  const note = findObject(id)
  if (!note) return <p className="p-4 text-body text-fg-muted">Note not found.</p>

  return (
    <div className="flex h-full min-h-48 flex-col gap-2 p-4">
      <h2 className="flex items-center gap-2 text-heading">
        <LuStickyNote className="size-5 text-fg-subtle" aria-hidden="true" />
        {note.name}
      </h2>
      <p className="text-body text-fg-muted">Note text comes later.</p>
    </div>
  )
}
