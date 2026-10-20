import { useSyncExternalStore } from 'react'
import { listKey } from '../../../lib/resource/listStore'
import { useListStore } from '../../../lib/resource/listStoreContext'
import type { AnyResource } from '../../../resources/types'
import Divider from '../../ui/Divider'
import ResourceRows, { type SidebarTreeSettings } from './ResourceRows'

type Props = { resources: AnyResource[]; tree: SidebarTreeSettings; compact: boolean }

const isPinned = (item: Record<string, unknown>) => item.pinned === true

/**
 * Pinned: the pinned items of every sidebar list, by resource. Lists come pinned first, so their first page holds them. It reads the
 * lists the sections load (the same store entries: no request of its own) and shows nothing when nothing is pinned.
 */
export default function SidebarPinned({ resources, tree, compact }: Props) {
  const store = useListStore()
  const keys = resources.map((r) => listKey(r.name, { archived: false }))
  const states = useSyncExternalStore(store.watchAll, () => store.snapshotMany(keys))
  const withPins = resources.filter((_, i) => states[i].items.some((item) => isPinned(item as Record<string, unknown>)))
  if (withPins.length === 0) return null
  return (
    <section aria-label="Pinned">
      <Divider label="Pinned" compact={compact} className="my-(--divider-gap)" />
      {withPins.map((resource) => (
        <ResourceRows key={resource.name} resource={resource} tree={tree} compact={compact} only={isPinned} prefix="pin:" quiet />
      ))}
    </section>
  )
}
