import { useState, type ReactNode } from 'react'
import { useResourceActions, useResourceItem } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import type { EditedItem } from './useItemAutosave'

type Props = {
  resource: AnyResource
  /** The item's id */
  id: string
  /** The item, once it is loaded and not in the Trash */
  children: (item: EditedItem) => ReactNode
}

/**
 * Loads one item for an editor (ResourceEditor, the article page) and says what is in the way: gone, could not be loaded (Try
 * again), loading, or in the Trash (Restore). Otherwise it renders `children` with the item.
 */
export default function ResourceItemGate({ resource, id, children }: Props) {
  const { item, status, error, notFound, refresh } = useResourceItem(resource, id)
  const loaded = item as EditedItem | null
  const what = resource.ui.label.toLowerCase()
  const { restore } = useResourceActions(resource)
  const [restoring, setRestoring] = useState(false)

  if (notFound) return <p className="p-4 text-body text-fg-muted">This {what} is gone.</p>
  if (status === 'error' && !loaded) {
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
  if (!loaded) return <p className="p-4 text-body text-fg-subtle">Loading…</p>
  if (loaded.archived) {
    return (
      <div className="flex flex-col items-start gap-3 p-4">
        <p className="text-body text-fg-muted">This {what} is in the Trash.</p>
        <Button
          variant="secondary"
          disabled={restoring}
          onClick={() => {
            setRestoring(true)
            void restore(loaded.id).finally(() => setRestoring(false))
          }}
        >
          {restoring ? 'Restoring…' : 'Restore'}
        </Button>
      </div>
    )
  }
  return children(loaded)
}
