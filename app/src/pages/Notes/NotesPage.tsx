import { useState } from 'react'
import ResourcePage from '../../components/ui/resource/ResourcePage'
import { notesResource } from '../../resources/notes/notes.resource'
import NoteModal from '../../resources/notes/NoteModal'
import { asAnyResource } from '../../resources/types'

const resource = asAnyResource(notesResource)

// Also a workspace panel (src/panels.ts): no <main> here, AppLayout provides it
/** Every note, pinned first, as a list. A click opens the note; drag one onto a pane edge to open it there, or onto the Trash */
export default function NotesPage() {
  const [noteId, setNoteId] = useState<string | null>(null)
  return (
    <>
      <ResourcePage resource={resource} description="Pinned notes come first." onOpenItem={setNoteId} />
      <NoteModal noteId={noteId} onClose={() => setNoteId(null)} />
    </>
  )
}
