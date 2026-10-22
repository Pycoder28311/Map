import { useEffect, useRef, useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import Button from '../buttons/Button'
import Modal from '../overlays/Modal'
import ResourceDeleteDialog from './ResourceDeleteDialog'
import ResourceForm from './ResourceForm'
import SaveStatus from './SaveStatus'
import { authClient } from '../../../lib/auth-client'
import { browserStorage, clearDraft, decideOnOpen, draftKey, readDraft } from '../../../lib/resource/autosave'
import { changedFields, sameValues, valuesOf, type FormValues } from '../../../lib/resource/changed'
import { useResourceActions, useResourceItem } from '../../../lib/resource/hooks'
import { useAutosave } from '../../../lib/resource/useAutosave'
import type { AnyResource } from '../../../resources/types'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** What the editor needs of an item of any resource */
type Item = { id: number | string; title: string; archived: boolean; createdAt: string; updatedAt: string } & Record<string, unknown>

type Props = {
  resource: AnyResource
  /** The item's id */
  id: string
  /** Set in the modal: a Close button saves first, then calls it */
  onClose?: () => void
  /** The field that gets the cursor when it opens (default: the title) */
  focusField?: string
  /** With `onClose`, a Close button at the bottom (default); false when the modal has its own X (onClose is still called after a delete) */
  showClose?: boolean
}

/**
 * One item of a resource (a note, a project), edited in place (the modal and the panel use it): the resource's fields, saved as you
 * write (useAutosave: 30 s without a change, and 30 s at most after the first, at once when the page is hidden, a draft on this device meanwhile).
 * An item in the Trash says so, with Restore.
 */
export default function ResourceEditor({ resource, id, onClose, focusField, showClose = true }: Props) {
  const { item, status, error, notFound, refresh } = useResourceItem(resource, id)
  const note = item as Item | null
  const what = resource.ui.label.toLowerCase()
  const { restore } = useResourceActions(resource)
  const [restoring, setRestoring] = useState(false)

  if (notFound) return <p className="p-4 text-body text-fg-muted">This {what} is gone.</p>
  if (status === 'error' && !note) {
    return (
      <div className="flex flex-col items-start gap-2 p-4">
        <p role="alert" className="text-body text-danger">
          {error?.message ?? `Could not load the ${what}.`}
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
        <p className="text-body text-fg-muted">This {what} is in the Trash.</p>
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
  return <ItemForm key={note.id} resource={resource} note={note} onClose={onClose} focusField={focusField} showClose={showClose} />
}

function ItemForm({ resource, note, onClose, focusField = 'title', showClose = true }: { resource: AnyResource; note: Item; onClose?: () => void; focusField?: string; showClose?: boolean }) {
  const what = resource.ui.label.toLowerCase()
  const { update } = useResourceActions(resource)
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  // What the server has (the values changes are compared with) and the version of it the draft is a change of
  const saved = useRef<FormValues>(valuesOf(resource, note))
  const base = useRef(note.updatedAt)

  // A draft kept on this device since the last time: applied if it changes the server's current version, asked about if the item
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
  const [deleting, setDeleting] = useState(false)
  const [start, setStart] = useState<{ values: FormValues; version: number }>({
    values: boot.decision === 'apply' && boot.draft ? boot.draft.values : saved.current,
    version: 0,
  })

  const autosave = useAutosave<FormValues>({
    save: async (values, { keepalive }) => {
      const patch = changedFields(values, saved.current)
      if (Object.keys(patch).length === 0) return
      const result = (await update(note.id, patch, { keepalive })) as Item
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
      <ResourceForm key={start.version} resource={resource} initial={start.values} onChange={autosave.change} autoFocusField={focusField} />
      <div className="mt-2 flex items-center gap-2">
        <Button variant="ghost" icon={LuTrash2} className="text-danger" onClick={() => setDeleting(true)}>
          Delete
        </Button>
        <SaveStatus status={autosave.status} />
        <span className="ms-auto text-small text-fg-subtle">Created {DATE.format(new Date(note.createdAt))}</span>
        {onClose && showClose && (
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
      {deleting && (
        <ResourceDeleteDialog
          resource={resource}
          item={{ id: note.id, title: note.title }}
          onClose={() => setDeleting(false)}
          onDeleting={autosave.hold}
          onFailed={autosave.release}
          onDeleted={() => {
            autosave.discard()
            onClose?.()
          }}
        />
      )}
      {conflict && (
        <Modal
          open
          onClose={useServers}
          title={`This ${what} changed`}
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
          <p className="text-body">This {what} was changed somewhere else after you made the changes kept on this device. Which version do you want?</p>
        </Modal>
      )}
    </div>
  )
}
