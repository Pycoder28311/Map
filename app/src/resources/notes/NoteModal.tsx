import Modal from '../../components/ui/overlays/Modal'
import NoteEditor from './NoteEditor'

type Props = {
  /** The note to edit; null: closed */
  noteId: string | null
  onClose: () => void
}

/** A note in a modal, like Google Keep: a borderless title and text, a checklist button in its toolbar, and Close. No Save: it saves as you write and when it closes */
export default function NoteModal({ noteId, onClose }: Props) {
  return (
    <Modal open={noteId !== null} onClose={onClose} title="Note" size="md" bare className="bg-note">
      {noteId && <NoteEditor key={noteId} id={noteId} onClose={onClose} />}
    </Modal>
  )
}
