import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import Button from '../buttons/Button'
import ItemConflictModal from './ItemConflictModal'
import ResourceDeleteDialog from './ResourceDeleteDialog'
import ResourceForm from './ResourceForm'
import ResourceItemGate from './ResourceItemGate'
import SaveStatus from './SaveStatus'
import { useItemAutosave, type EditedItem } from './useItemAutosave'
import type { AnyResource } from '../../../resources/types'

const DATE = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

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
  return (
    <ResourceItemGate resource={resource} id={id}>
      {(note) => <ItemForm key={note.id} resource={resource} note={note} onClose={onClose} focusField={focusField} showClose={showClose} />}
    </ResourceItemGate>
  )
}

function ItemForm({ resource, note, onClose, focusField = 'title', showClose = true }: { resource: AnyResource; note: EditedItem; onClose?: () => void; focusField?: string; showClose?: boolean }) {
  const what = resource.ui.label.toLowerCase()
  const autosave = useItemAutosave(resource, note)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="flex flex-col gap-2 p-4">
      <ResourceForm key={autosave.start.version} resource={resource} initial={autosave.start.values} onChange={autosave.change} autoFocusField={focusField} />
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
      {autosave.conflict && <ItemConflictModal what={what} onKeepMine={autosave.keepMine} onUseServers={autosave.useServers} />}
    </div>
  )
}
