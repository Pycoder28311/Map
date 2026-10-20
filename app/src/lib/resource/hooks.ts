// The data hooks every screen of a resource uses. Lists and items are read through one shared store (listStore.ts), so screens that
// show the same data ask the server once; a write that succeeded goes into it (changes.ts) without reading again.
import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { notifyChanged } from './changes'
import { itemKey, listKey, NO_ITEM } from './listStore'
import { useListStore } from './listStoreContext'
import type { ItemState, ListState } from './state'
import type { ResourceCore } from './types'

export type ListOptions = {
  /**
   * false (the default): the live items. true: the ones in the Trash. Every list asks `archived` through this, so a screen cannot
   * forget the rule that a trashed item shows only in the Trash
   */
  trashed?: boolean
  /** Items per page (default: the API's page size) */
  limit?: number
  /** false: does not load (e.g. a popout that is closed) */
  enabled?: boolean
}

export type ListResult<TListItem> = {
  items: TListItem[]
  status: ListState<TListItem>['status']
  error: Error | null
  hasMore: boolean
  loadingMore: boolean
  /** Loading again while the old items stay on screen */
  refreshing: boolean
  loadMore: () => void
  refresh: () => void
}

/**
 * A resource's list, a page at a time: `loadMore` shows the next page. The list is shared with every other screen that shows it
 * (ResourcesProvider): this one shows its first `limit` items (more after `loadMore`) and what it needs beyond what is held is read
 * after the cursor, never from the start. It loads again when the resource changes
 */
export function useResourceList<TItem, TListItem, TInput, TUpdate, TFilter extends { archived: boolean }>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
  { trashed = false, limit = PAGE_SIZE_DEFAULT, enabled = true }: ListOptions = {},
): ListResult<TListItem> {
  const store = useListStore()
  const filter = useMemo(() => ({ archived: trashed }), [trashed])
  const key = listKey(resource.name, filter)
  const [shown, setShown] = useState(limit)
  const count = Math.max(limit, shown)
  const subscribe = useCallback(
    (onChange: () => void) => (enabled ? store.subscribe(key, resource, filter, count, onChange) : () => {}),
    [store, key, resource, filter, count, enabled],
  )
  const state = useSyncExternalStore(subscribe, () => store.snapshot(key)) as ListState<TListItem>
  const items = useMemo(() => state.items.slice(0, count), [state.items, count])
  const hasMore = state.items.length > count || state.nextCursor !== null
  const loadMore = useCallback(() => {
    if (!state.loadingMore && hasMore) setShown(count + limit)
  }, [state.loadingMore, hasMore, count, limit])
  const refresh = useCallback(() => store.load(key), [store, key])

  return {
    items,
    status: state.status,
    error: state.error,
    hasMore,
    loadingMore: state.loadingMore,
    refreshing: state.refreshing,
    loadMore,
    refresh,
  }
}

export type ItemResult<TItem> = {
  item: TItem | null
  status: ItemState<TItem>['status']
  error: Error | null
  notFound: boolean
  refresh: () => void
}

/**
 * One item by id. Shared with every other screen that shows it at the same time (a note in the editor and in the Recent list is read
 * once, listStore.ts); it is read when a screen starts showing it, takes the server's version when it is written through
 * useResourceActions, and is gone when it is deleted
 */
export function useResourceItem<TItem, TListItem, TInput, TUpdate, TFilter extends object>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
  id: number | string | undefined,
): ItemResult<TItem> {
  const store = useListStore()
  const key = id === undefined ? '' : itemKey(resource.name, id)
  const subscribe = useCallback(
    (onChange: () => void) => (id === undefined ? () => {} : store.subscribeItem(resource, id, onChange)),
    [store, resource, id],
  )
  const state = useSyncExternalStore(subscribe, () => (id === undefined ? NO_ITEM : store.itemSnapshot(key))) as ItemState<TItem>
  const refresh = useCallback(() => store.loadItem(key), [store, key])
  return { item: state.item, status: state.status, error: state.error, notFound: state.status === 'notFound', refresh }
}

export type ResourceActions<TItem, TInput, TUpdate> = {
  create: (input: TInput) => Promise<TItem>
  update: (id: number | string, patch: TUpdate, options?: { keepalive?: boolean }) => Promise<TItem>
  remove: (id: number | string) => Promise<void>
  /** Into the Trash (archived: true) */
  trash: (id: number | string) => Promise<TItem>
  /** Out of the Trash (archived: false) */
  restore: (id: number | string) => Promise<TItem>
}

/** The writes of a resource. Each tells the others on screen (lists load again, an open item takes the new version) and resolves with the server's answer */
export function useResourceActions<TItem extends { id: number | string }, TListItem, TInput, TUpdate extends { archived?: boolean }, TFilter extends object>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
): ResourceActions<TItem, TInput, TUpdate> {
  return useMemo(() => {
    const { name, api } = resource
    const written = (item: TItem) => (notifyChanged({ name, item }), item)
    const update = async (id: number | string, patch: TUpdate, options?: { keepalive?: boolean }) => written(await api.update(id, patch, options))
    return {
      create: async (input) => written(await api.create(input)),
      update,
      remove: async (id) => {
        await api.remove(id)
        notifyChanged({ name, removedId: id })
      },
      trash: (id) => update(id, { archived: true } as TUpdate),
      restore: (id) => update(id, { archived: false } as TUpdate),
    }
  }, [resource])
}
