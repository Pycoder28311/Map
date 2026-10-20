import { useId, useState, type FormEvent } from 'react'
import { useResourceActions } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import TextField from '../fields/TextField'
import Modal from '../overlays/Modal'

const MAX_TITLE = 200

type Props = {
  resource: AnyResource
  onClose: () => void
  /** More fields the new item starts with (a parent: `{ objectType, objectId }`) */
  initial?: Record<string, unknown>
  /** Called with the created item */
  onCreated?: (item: Record<string, unknown> & { id: number | string }) => void
}

/** "New <thing>": asks for its title and creates it through the API. Mounted only while open, so the form starts fresh every time */
export default function ResourceCreateDialog({ resource, initial, onClose, onCreated }: Props) {
  const formId = useId()
  const { create } = useResourceActions(resource)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = resource.ui.fields.find((field) => field.heading)?.name ?? 'title'
  const valid = title.trim().length > 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const item = await create({ ...initial, [heading]: title.trim() })
      onCreated?.(item)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create it.')
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`New ${resource.ui.label.toLowerCase()}`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!valid || busy}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-2">
        <TextField label="Title" value={title} maxLength={MAX_TITLE} onChange={(e) => setTitle(e.target.value)} data-autofocus />
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
