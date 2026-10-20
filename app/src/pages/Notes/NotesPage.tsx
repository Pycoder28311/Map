import { useState } from 'react'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import ResourcePage from '../../components/ui/resource/ResourcePage'
import { notesResource } from '../../resources/notes/notes.resource'
import { asAnyResource } from '../../resources/types'

const resource = asAnyResource(notesResource)

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/** Every note, pinned first, as a list. A click opens the note; drag one onto a pane edge to open it there, or onto the Trash */
export default function NotesPage() {
  const [noteId, setNoteId] = useState<string | null>(null)
  return (
    <>
      <ResourcePage resource={resource} description="Pinned notes come first." onOpenItem={setNoteId} />
      <ResourceModal resource={resource} itemId={noteId} onClose={() => setNoteId(null)} />
    </>
  )
}
