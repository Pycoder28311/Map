// The Trash's side of the resources: the archived items of every resource that shows in the Trash (surfaces.trash), loaded together,
// and "empty the Trash" for them. Loaded when `enabled` turns on (the Trash is opened), kept in the shared lists (listStore.ts).
import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { AnyResource } from '../../resources/types'
import { notifyChanged } from './changes'
import { listKey } from './listStore'
import { useListStore } from './listStoreContext'

export type TrashedItem = Record<string, unknown> & { id: number | string }

export type TrashSection = {
  resource: AnyResource
  items: TrashedItem[]
  /** There are more in the Trash than were loaded (one page of the most) */
  more: boolean
}

type State = { sections: TrashSection[]; status: 'loading' | 'ready' | 'error'; error: Error | null }

const TRASHED = { archived: true }

/**
 * The Trash items of these resources (one page each), shared with every other screen that reads them (listStore.ts): opened a
 * second time they are not read again, unless a resource changed. `refresh` loads again. Nothing is asked while `enabled` is false
 */
export function useTrashedItems(resources: AnyResource[], enabled = true) {
  const store = useListStore()
  const keys = useMemo(() => resources.map((r) => listKey(r.name, TRASHED)), [resources])

  useEffect(() => {
    if (!enabled) return
    const stops = resources.map((resource, i) => store.subscribe(keys[i], resource, TRASHED, PAGE_SIZE_MAX, () => {}))
    return () => stops.forEach((stop) => stop())
  }, [store, resources, keys, enabled])

  const states = useSyncExternalStore(store.watchAll, () => store.snapshotMany(keys))
  const sections: TrashSection[] = resources.map((resource, i) => ({ resource, items: states[i].items as TrashedItem[], more: states[i].nextCursor !== null }))
  const status: State['status'] = states.every((s) => s.loaded) ? 'ready' : states.some((s) => s.status === 'error') ? 'error' : 'loading'
  const error = states.find((s) => s.error)?.error ?? null
  const refresh = () => keys.forEach((key) => store.load(key))

  const total = sections.reduce((n, s) => n + s.items.length, 0)
  return { sections, status, error, total, more: sections.some((s) => s.more), refresh }
}

/**
 * Deletes every item in these Trash sections for good, one request each (there is no bulk route). Stops at the first failure and
 * throws it; what was deleted before stays deleted. Tells the lists on screen what was deleted once at the end
 */
export async function emptyTrashSections(sections: TrashSection[]): Promise<void> {
  const deleted: { name: string; id: number | string }[] = []
  try {
    for (const { resource, items } of sections) {
      for (const item of items) {
        await resource.api.remove(item.id)
        deleted.push({ name: resource.name, id: item.id })
      }
    }
  } finally {
    deleted.forEach(({ name, id }) => notifyChanged({ name, removedId: id }))
  }
}
