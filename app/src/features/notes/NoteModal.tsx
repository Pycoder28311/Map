import { useEffect, useRef, useState } from 'react'
import { LuListChecks } from 'react-icons/lu'
import Button from '../../components/ui/buttons/Button'
import IconButton from '../../components/ui/buttons/IconButton'
import Modal from '../../components/ui/overlays/Modal'
import type { ChecklistItem } from '../../mocks/projects'
import { findObject } from '../../mocks/projects'
import { updateNote, useMockObjects } from '../../mocks/projectsStore'
import RichTextField from '../../components/ui/fields/RichTextField'
import ChecklistEditor from './ChecklistEditor'
import { itemsToText, textToItems } from './checklist'
import { htmlToPlain, toHtml } from './noteHtml'

/** How long after the last keystroke the note is saved (ms) */
const SAVE_AFTER = 300
const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

type Props = {
  /** The note to edit; null: closed */
  noteId: string | null
  onClose: () => void
}

type Draft = { name: string; text: string; items: ChecklistItem[] | undefined }

/**
 * A note in a modal, like Google Keep: a borderless title and text (or a checklist), a button to switch
 * to a checklist, and Close. No Save: it saves as you type and when it closes.
 */
export default function NoteModal({ noteId, onClose }: Props) {
  return (
    <Modal open={noteId !== null} onClose={onClose} title="Note" size="md" bare className="bg-note">
      {noteId && <NoteEditor key={noteId} noteId={noteId} onClose={onClose} />}
    </Modal>
  )
}

function NoteEditor({ noteId, onClose }: { noteId: string; onClose: () => void }) {
  useMockObjects() // the note can change under us (deleted from the sidebar)
  const note = findObject(noteId)
  const [draft, setDraft] = useState<Draft>(() => ({ name: note?.name ?? '', text: note?.text ?? '', items: note?.items }))
  const latest = useRef(draft)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)

  const flush = () => {
    window.clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    const { name, text, items } = latest.current
    updateNote(noteId, { name: name.trim() || 'Untitled note', text, items })
  }
  // Closing (Esc, backdrop, Close) unmounts this: save what is pending
  useEffect(() => flush, []) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (next: Draft) => {
    latest.current = next
    dirty.current = true
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, SAVE_AFTER)
  }

  if (!note) return <p className="p-4 text-body text-fg-muted">This note is gone.</p>
  const checklist = draft.items !== undefined

  const toggleChecklist = () =>
    change(
      checklist
        ? { ...draft, items: undefined, text: toHtml(itemsToText(draft.items!)) }
        : { ...draft, items: textToItems(htmlToPlain(draft.text)), text: '' },
    )

  return (
    <div className="flex flex-col gap-2 p-4">
      <input
        data-autofocus
        value={draft.name}
        onChange={(e) => change({ ...draft, name: e.target.value })}
        placeholder="Title"
        aria-label="Title"
        className="w-full bg-transparent text-heading outline-none placeholder:text-fg-subtle"
      />
      {checklist ? (
        <ChecklistEditor items={draft.items!} onChange={(items) => change({ ...draft, items })} />
      ) : (
        <RichTextField
          value={draft.text}
          onChange={(text) => change({ ...latest.current, text })}
          placeholder="Take a note…"
          label="Text"
          toolbar
        />
      )}
      <div className="mt-2 flex items-center gap-2">
        <IconButton icon={LuListChecks} label={checklist ? 'Hide checkboxes' : 'Show checkboxes'} onClick={toggleChecklist} />
        <span className="ms-auto text-small text-fg-subtle">Created {DATE.format(note.createdAt)}</span>
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
