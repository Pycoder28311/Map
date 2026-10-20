import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { listKey } from '../../lib/resource/listStore'
import { useListStore } from '../../lib/resource/listStoreContext'
import type { AnyResource } from '../../resources/types'
import type { SearchItem } from './search'

/** The most items of one resource the search reads (5 pages of the API's biggest). A longer list is "capped" */
export const SEARCH_MAX_ITEMS = 5 * PAGE_SIZE_MAX

const LIVE = { archived: false }

/** A resource's item as the search sees it: its title, and the subtitle (a note's preview) to find it by */
export const toSearchItem = (resource: AnyResource, item: Record<string, unknown> & { id: number | string }): SearchItem => ({
  id: String(item.id),
  kind: resource.panelType,
  name: resource.ui.row.title(item),
  text: resource.ui.row.subtitle?.(item) ?? '',
})

/**
 * The items of these resources for the search: their live (not archived) items, read when `enabled` (the search is open). They come
 * from the shared lists (listStore.ts): what the sidebar or the Dashboard already read is not read again, only the rest, and opening the
 * search a second time reads nothing. Archived items are never asked for, so they can not be found.
 */
export function useSearchItems(resources: AnyResource[], enabled: boolean): { items: SearchItem[]; loading: boolean; capped: boolean } {
  const store = useListStore()
  const keys = useMemo(() => resources.map((r) => listKey(r.name, LIVE)), [resources])

  useEffect(() => {
    if (!enabled) return
    const stops = resources.map((resource, i) => store.subscribe(keys[i], resource, LIVE, SEARCH_MAX_ITEMS, () => {}))
    return () => stops.forEach((stop) => stop())
  }, [store, resources, keys, enabled])

  const states = useSyncExternalStore(store.watchAll, () => store.snapshotMany(keys))
  const items = useMemo(
    () => states.flatMap((state, i) => (state.items as (Record<string, unknown> & { id: number | string })[]).map((item) => toSearchItem(resources[i], item))),
    [states, resources],
  )
  const loading = enabled && states.some((s) => !s.loaded || s.loadingMore)
  const capped = states.some((s) => s.nextCursor !== null)
  return { items, loading, capped }
}
