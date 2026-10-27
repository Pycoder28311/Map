import { useMemo, useState } from 'react'
import { LuUnlink } from 'react-icons/lu'
import { CHILDREN } from '../../../features/dashboard/childResources'
import { groupByParent, type Entry } from '../../../features/dashboard/tree'
import { actionsOf, useResourceLists } from '../../../lib/resource/hooks'
import { compareEntries, positionAtStart } from '../../../lib/resource/reorder'
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
 * "Move <item> to": the places it can go (every item of the resources it can have as a parent: projects, folders) as a tree, folders below
 * their project or folder, and "No parent".
 * A pick changes its parent (objectType + objectId) and puts it first among its new parent's items (its place in the old list means nothing in the new one), with one update; the server checks the parent is the user's and is not a cycle (a
 * folder in itself), and says so here if not. The lists are the ones the Dashboard and sidebar hold (read only if none does).
 */
export default function ResourceMoveDialog({ resource, item, onClose }: Props) {
  const parents = useMemo(() => (resource.parents ?? []).flatMap((p) => resourceByName(p.resource) ?? []), [resource])
  const { lists, ready } = useResourceLists(parents)
  // What is in each parent now (for the place it takes there): the Dashboard's lists, shared
  const kids = useResourceLists(CHILDREN)
  const entries = useMemo(() => kids.lists.flatMap(({ resource: r, items }) => items.map((other) => ({ resource: r, item: other }) as Entry)), [kids.lists])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const move = async (parent: { type: string; id: number | string; resource?: string } | null) => {
    setBusy(true)
    setError(null)
    try {
      // First among the items of its new parent (none: among those with no parent), not counting itself
      const there = (parent && parent.resource ? (groupByParent(entries).get(`${parent.resource}:${parent.id}`) ?? []) : entries.filter((e) => e.item.objectType == null))
        .filter((e) => !(e.resource.name === resource.name && String(e.item.id) === String(item.id)))
        .sort(compareEntries)
      await actionsOf(resource).update(item.id, { objectType: parent?.type ?? null, objectId: parent ? Number(parent.id) : null, ...(kids.ready ? { position: positionAtStart(there) } : {}) })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not move it.')
      setBusy(false)
    }
  }

  // The places as a tree: each project (or folder with no parent) with its folders below it, and theirs below them. Not the item
  // itself (nor what is inside it: a folder cannot go into its own children)
  type Place = { target: AnyResource; type: string; id: number; title: string; depth: number }
  const places = useMemo(() => {
    type Node = { target: AnyResource; item: Record<string, unknown> & { id: number | string } }
    const kids = new Map<string, Node[]>()
    const roots: Node[] = []
    for (const { resource: target, items } of lists) {
      for (const item of items as Node['item'][]) {
        const parent = target.parents?.find((p) => p.type === item.objectType)
        const key = parent && item.objectId !== null && item.objectId !== undefined ? `${parent.resource}:${item.objectId}` : null
        if (key) kids.set(key, [...(kids.get(key) ?? []), { target, item }])
        else roots.push({ target, item })
      }
    }
    const out: Place[] = []
    const walk = (node: Node, depth: number) => {
      const type = resource.parents?.find((p) => p.resource === node.target.name)?.type
      const self = node.target.name === resource.name && String(node.item.id) === String(item.id)
      if (self) return
      if (type) out.push({ target: node.target, type, id: node.item.id as number, title: node.target.ui.row.title(node.item as never), depth })
      for (const child of kids.get(`${node.target.name}:${node.item.id}`) ?? []) walk(child, depth + 1)
    }
    for (const root of roots) walk(root, 0)
    return out
  }, [lists, resource, item.id])

  return (
    <Modal open onClose={onClose} title={`Move "${item.title || resource.ui.untitled}" to`} size="sm">
      <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
        <li>
          <Button variant="ghost" plain icon={LuUnlink} className="w-full justify-start" disabled={busy} onClick={() => void move(null)}>
            No parent (Orphans)
          </Button>
        </li>
        {places.map(({ target, type, id, title, depth }) => (
          <li key={`${target.name}:${id}`} style={{ paddingInlineStart: `${depth * 0.625}rem` }}>
            <Button variant="ghost" plain icon={target.ui.icon} className="w-full justify-start" disabled={busy} onClick={() => void move({ type, id, resource: target.name })}>
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
