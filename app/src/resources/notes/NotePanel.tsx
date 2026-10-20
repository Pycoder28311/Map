import type { PanelProps } from '../../features/workspace/types'
import NoteEditor from './NoteEditor'

/** One note as a workspace panel (registered from the notes resource): edited in place, like in the modal */
export default function NotePanel({ id }: PanelProps) {
  if (!id) return <p className="p-4 text-body text-fg-muted">Not found.</p>
  return (
    <div className="flex h-full min-h-48 flex-col">
      <NoteEditor key={id} id={id} />
    </div>
  )
}
