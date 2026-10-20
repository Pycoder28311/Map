import { useMemo, useState } from 'react'
import { LuUnlink } from 'react-icons/lu'
import { actionsOf, useResourceLists } from '../../../lib/resource/hooks'
import { resourceByName } from '../../../resources/registry'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import Modal from '../overlays/Modal'

type Props = {
  resource: AnyResource
  item: { id: number | string; title: string }
  onClose: () => void
}

/**
 * "Move <item> to": the places it can go (every item of the resources it can have as a parent: projects, folders), and "No parent".
 * A pick changes its parent (objectType + objectId) with one update; the server checks the parent is the user's and is not a cycle (a
 * folder in itself), and says so here if not. The lists are the ones the Dashboard and sidebar hold (read only if none does).
 */
export default function ResourceMoveDialog({ resource, item, onClose }: Props) {
  const parents = useMemo(() => (resource.parents ?? []).flatMap((p) => resourceByName(p.resource) ?? []), [resource])
  const { lists, ready } = useResourceLists(parents)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const move = async (parent: { type: string; id: number | string } | null) => {
    setBusy(true)
    setError(null)
    try {
      await actionsOf(resource).update(item.id, { objectType: parent?.type ?? null, objectId: parent ? Number(parent.id) : null })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move it.')
      setBusy(false)
    }
  }

  const places = lists.flatMap(({ resource: target, items }) => {
    const type = resource.parents?.find((p) => p.resource === target.name)?.type
    if (!type) return []
    // Not itself (the server also refuses its own children)
    return items.filter((other) => !(target.name === resource.name && String(other.id) === String(item.id))).map((other) => ({ target, type, id: other.id as number, title: target.ui.row.title(other as never) }))
  })

  return (
    <Modal open onClose={onClose} title={`Move "${item.title || resource.ui.untitled}" to`} size="sm">
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        <li>
          <Button variant="ghost" icon={LuUnlink} className="w-full justify-start" disabled={busy} onClick={() => void move(null)}>
            No parent (Orphans)
          </Button>
        </li>
        {places.map(({ target, type, id, title }) => (
          <li key={`${target.name}:${id}`}>
            <Button variant="ghost" icon={target.ui.icon} className="w-full justify-start" disabled={busy} onClick={() => void move({ type, id })}>
              <span className="truncate">{title}</span>
            </Button>
          </li>
        ))}
      </ul>
      {!ready && <p className="mt-2 text-small text-fg-subtle">Loading…</p>}
      {ready && places.length === 0 && <p className="mt-2 text-small text-fg-muted">Nothing to move it into yet.</p>}
      {error && (
        <p role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      )}
    </Modal>
  )
}
