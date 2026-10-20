import type { Note } from '@map/shared'
import { useEffect, useRef, useState } from 'react'
import Button from '../../components/ui/buttons/Button'
import Modal from '../../components/ui/overlays/Modal'
import ResourceForm from '../../components/ui/resource/ResourceForm'
import SaveStatus from '../../components/ui/resource/SaveStatus'
import { authClient } from '../../lib/auth-client'
import { browserStorage, clearDraft, decideOnOpen, draftKey, readDraft } from '../../lib/resource/autosave'
import { changedFields, sameValues, valuesOf, type FormValues } from '../../lib/resource/changed'
import { useResourceActions, useResourceItem } from '../../lib/resource/hooks'
import { useAutosave } from '../../lib/resource/useAutosave'
import { asAnyResource } from '../types'
import { notesResource } from './notes.resource'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const resource = asAnyResource(notesResource)

type Props = {
  /** The note's id */
  id: string
  /** Set in the modal: a Close button saves first, then calls it */
  onClose?: () => void
}

/**
 * One note, edited in place (the modal and the panel use it): a borderless title and the rich text, saved as you write
 * (useAutosave: 5 s without a change, 30 s at most, at once when the page is hidden, a draft on this device meanwhile).
 * A note in the Trash says so, with Restore.
 */
export default function NoteEditor({ id, onClose }: Props) {
  const { item: note, status, error, notFound, refresh } = useResourceItem(notesResource, id)
  const { restore } = useResourceActions(notesResource)
  const [restoring, setRestoring] = useState(false)

  if (notFound) return <p className="p-4 text-body text-fg-muted">This note is gone.</p>
  if (status === 'error' && !note) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p role="alert" className="text-body text-danger">
          {error?.message ?? 'Could not load the note.'}
        </p>
        <Button variant="secondary" onClick={refresh}>
          Try again
        </Button>
      </div>
    )
  }
  if (!note) return <p className="p-4 text-body text-fg-subtle">Loading…</p>
  if (note.archived) {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p className="text-body text-fg-muted">This note is in the Trash.</p>
        <Button
          variant="secondary"
          disabled={restoring}
          onClick={() => {
            setRestoring(true)
            void restore(note.id).finally(() => setRestoring(false))
          }}
        >
          {restoring ? 'Restoring…' : 'Restore'}
        </Button>
      </div>
    )
  }
  return <NoteForm key={note.id} note={note} onClose={onClose} />
}

function NoteForm({ note, onClose }: { note: Note; onClose?: () => void }) {
  const { update } = useResourceActions(notesResource)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // What the server has (the values changes are compared with) and the version of it the draft is a change of
  const saved = useRef<FormValues>(valuesOf(resource, note))
  const base = useRef(note.updatedAt)

  // A draft kept on this device since the last time: applied if it changes the server's current version, asked about if the note
  // changed since, dropped if it holds nothing new
  const [boot] = useState(() => {
    const storage = browserStorage()
    const key = userId ? draftKey(userId, resource.name, note.id) : null
    const draft = key ? readDraft<FormValues>(storage, key) : null
    const decision = decideOnOpen(draft, { updatedAt: note.updatedAt, values: saved.current }, sameValues)
    if (draft && decision === 'none' && key) clearDraft(storage, key)
    return { key, draft, decision }
  })
  const [conflict, setConflict] = useState(boot.decision === 'conflict')
  const [start, setStart] = useState<{ values: FormValues; version: number }>({
    values: boot.decision === 'apply' && boot.draft ? boot.draft.values : saved.current,
    version: 0,
  })

  const autosave = useAutosave<FormValues>({
    save: async (values, { keepalive }) => {
      const patch = changedFields(values, saved.current)
      if (Object.keys(patch).length === 0) return
      const result = await update(note.id, patch, { keepalive })
      saved.current = valuesOf(resource, result)
      base.current = result.updatedAt
    },
    draft: boot.key ? { key: boot.key, baseUpdatedAt: () => base.current } : undefined,
  })

  // An applied draft is sent at once
  useEffect(() => {
    if (boot.decision === 'apply' && boot.draft) {
      autosave.change(boot.draft.values)
      void autosave.flush()
    }
    // Once, when the editor opens
  }, [])

  const keepMine = () => {
    if (!boot.draft) return
    setStart((s) => ({ values: boot.draft!.values, version: s.version + 1 }))
    setConflict(false)
    autosave.change(boot.draft.values)
    void autosave.flush()
  }
  const useServers = () => {
    if (boot.key) clearDraft(browserStorage(), boot.key)
    setConflict(false)
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      <ResourceForm key={start.version} resource={resource} initial={start.values} onChange={autosave.change} autoFocusField="title" />
      <div className="mt-2 flex items-center gap-2">
        <SaveStatus status={autosave.status} />
        <span className="ms-auto text-small text-fg-subtle">Created {DATE.format(new Date(note.createdAt))}</span>
        {onClose && (
          <Button
            variant="ghost"
            onClick={() => {
              void autosave.flush().finally(onClose)
            }}
          >
            Close
          </Button>
        )}
      </div>
      {conflict && (
        <Modal
          open
          onClose={useServers}
          title="This note changed"
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={useServers}>
                Use the saved version
              </Button>
              <Button onClick={keepMine}>Keep my changes</Button>
            </>
          }
        >
          <p className="text-body">This note was changed somewhere else after you made the changes kept on this device. Which version do you want?</p>
        </Modal>
      )}
    </div>
  )
}
