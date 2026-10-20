import { useState } from 'react'
import { useResourceActions } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import Modal from '../overlays/Modal'

type Props = {
  resource: AnyResource
  item: { id: number | string; title: string }
  onClose: () => void
  /** Called after it was deleted */
  onDeleted?: () => void
}

/** "Delete for good?" for any resource: asks first, deletes through the API, says so if it failed */
export default function ResourceDeleteDialog({ resource, item, onClose, onDeleted }: Props) {
  const { remove } = useResourceActions(resource)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await remove(item.id)
      onDeleted?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete.')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Delete ${resource.ui.label.toLowerCase()}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="secondary" className="text-danger" onClick={confirm} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete'}
          </Button>
        </>
      }
    >
      <p className="text-body">Delete "{item.title || resource.ui.untitled}" for good? This can't be undone.</p>
      {error && (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      )}
    </Modal>
  )
}
