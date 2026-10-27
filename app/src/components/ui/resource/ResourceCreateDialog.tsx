import { useId, useState, type FormEvent } from 'react'
import DraftAsk from '../../../features/create/DraftAsk'
import { draftOutcome } from '../../../features/create/draftOutcome'
import { useOpenLayout } from '../../../features/objects/ListRows'
import { single } from '../../../features/workspace/layout'
import { useResourceActions } from '../../../lib/resource/hooks'
import { NEW_ID } from '../../../lib/resource/newItem'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import TitleInput from '../fields/TitleInput'
import TitleTextFields from '../fields/TitleTextFields'
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

/**
 * "New <thing>": its title and text (the big input's fields), created through the API. The shared Modal, with its zoom button
 * (left of the X): it makes the item from what is typed and opens it as a page. A click outside decides (draftOutcome): nothing typed
 * closes it, text creates it, only a title asks first. Esc and the X discard. Mounted only while open, so the form starts fresh every time
 */
export default function ResourceCreateDialog({ resource, initial, onClose, onCreated }: Props) {
  const formId = useId()
  const { create } = useResourceActions(resource)
  const open = useOpenLayout()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const heading = resource.ui.fields.find((field) => field.heading)
  const headingName = heading?.name ?? 'title'
  // The first other field (its text: rich text or plain), when the resource has one
  const bodyField = resource.ui.fields.find((field) => !field.heading && (field.widget === 'richText' || field.widget === 'textarea'))
  // A title or some text (the item can be untitled)
  const valid = title.trim() !== '' || body.trim() !== ''

  const input = () => ({ ...initial, [headingName]: title.trim(), ...(bodyField && body ? { [bodyField.name]: body } : {}) })

  const make = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      const item = await create(input())
      onCreated?.(item)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create it.')
      setAsking(false)
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void make()
  }

  // A click outside the modal
  const outside = () => {
    if (busy) return
    const outcome = draftOutcome(title, body, { askOnTitleOnly: true })
    if (outcome === 'discard') onClose()
    else if (outcome === 'create') void make()
    else setAsking(true)
  }

  // Zoom (the modal closes first): with a title, the item is made and its page opens; without, the page of a new, empty one
  const zoom = () => {
    if (!valid) return open(single({ type: resource.panelType, id: NEW_ID }))
    void create(input())
      .then((item) => {
        onCreated?.(item)
        open(single({ type: resource.panelType, id: String(item.id) }))
      })
      .catch(() => {})
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`New ${resource.ui.label.toLowerCase()}`}
      size="md"
      zoomable
      onOutside={outside}
      flush
      onZoom={zoom}
      footer={
        asking ? (
          <DraftAsk question={`Create this ${resource.ui.label.toLowerCase()}?`} busy={busy} onCancel={onClose} onCreate={() => void make()} />
        ) : (
          <>
            <Button variant="ghost" filled onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={!valid || busy}>
              {busy ? 'Creating…' : 'Create'}
            </Button>
          </>
        )
      }
    >
      <form id={formId} onSubmit={submit} onPointerDown={() => setAsking(false)} className="flex flex-col">
        {bodyField ? (
          <TitleTextFields
            flush
            size="md"
            title={title}
            onTitle={setTitle}
            text={body}
            onText={setBody}
            rich={bodyField.widget !== 'textarea'}
            titlePlaceholder={heading?.placeholder}
            textPlaceholder={bodyField.placeholder}
            textLabel={bodyField.label ?? 'Text'}
            toolbar
            minTextHeight="min-h-56"
          />
        ) : (
          <TitleInput size="md" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" maxLength={MAX_TITLE} data-autofocus />
        )}
        {error && (
          <p role="alert" className="px-3 py-2 text-small text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
