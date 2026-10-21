// The data hooks every screen of a resource uses. Lists and items are read through one shared store (listStore.ts), so screens that
// show the same data ask the server once; a write that succeeded goes into it (changes.ts) without reading again.
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { AnyResource } from '../../resources/types'
import { notifyChanged, patchChanged } from './changes'
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
  /** More filters of the list, e.g. `{ objectType: 'none' }` (the items without a parent): a list of its own in the store */
  filter?: Record<string, string | number | boolean | undefined>
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
  { trashed = false, filter: more, limit = PAGE_SIZE_DEFAULT, enabled = true }: ListOptions = {},
): ListResult<TListItem> {
  const store = useListStore()
  // The same filter object while its values stay the same (the caller may pass a new object each render)
  const moreKey = JSON.stringify(more ?? {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filter = useMemo(() => ({ archived: trashed, ...more }), [trashed, moreKey])
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

export type ListsResult = {
  lists: { resource: AnyResource; items: Record<string, unknown>[]; status: ListState<unknown>['status']; hasMore: boolean }[]
  /** Every list loaded, none still loading */
  ready: boolean
  /** Some list has more than it holds */
  hasMore: boolean
  loadMore: () => void
}

/**
 * The live lists of several resources at once (the same lists the sidebar and the columns show: one store entry each, one request
 * each, shared), `limit` items of each (default: the API's biggest page; more with `loadMore`). For a screen that groups items of
 * different resources (the Dashboard's project rows), which cannot call useResourceList in a loop.
 */
export function useResourceLists(resources: AnyResource[], { limit = PAGE_SIZE_MAX, enabled = true }: { limit?: number; enabled?: boolean } = {}): ListsResult {
  const store = useListStore()
  const keys = useMemo(() => resources.map((r) => listKey(r.name, { archived: false })), [resources])
  const [count, setCount] = useState(limit)

  useEffect(() => {
    if (!enabled) return
    const stops = resources.map((resource, i) => store.subscribe(keys[i], resource, { archived: false }, Math.max(limit, count), () => {}))
    return () => stops.forEach((stop) => stop())
  }, [store, resources, keys, enabled, limit, count])

  const states = useSyncExternalStore(store.watchAll, () => store.snapshotMany(keys))
  const lists = resources.map((resource, i) => ({
    resource,
    items: states[i].items.slice(0, Math.max(limit, count)) as Record<string, unknown>[],
    status: states[i].status,
    hasMore: states[i].items.length > Math.max(limit, count) || states[i].nextCursor !== null,
  }))
  const hasMore = lists.some((l) => l.hasMore)
  const loadMore = useCallback(() => setCount((n) => n + limit), [limit])
  return { lists, ready: states.every((s) => s.loaded), hasMore, loadMore }
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

/**
 * The writes of a resource. Each tells the screens what the server answered (the cached lists and an open item take it in, no read)
 * and resolves with that answer. Not a hook: for code that writes to a resource it picks at run time (the Create modal)
 */
export function actionsOf<TItem extends { id: number | string }, TListItem, TInput, TUpdate extends { archived?: boolean }, TFilter extends object>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
): ResourceActions<TItem, TInput, TUpdate> {
  const { name, api } = resource
  const written = (item: TItem) => (notifyChanged({ name, item }), item)
  /**
   * The change shows at once (patchChanged); the request follows. Updates of one item go to the server one after the other, in the
   * order they were made. The answer replaces what was shown (with the fields of updates still waiting on top of it, so they do not
   * flicker back). A refusal takes the change back, field by field (undo).
   */
  const update = async (id: number | string, patch: TUpdate, options?: { keepalive?: boolean }) => {
    const key = itemKey(name, id)
    const queue = queues.get(key) ?? { last: Promise.resolve(), ops: [] }
    queues.set(key, queue)
    const fields = patch as Record<string, unknown>
    const shown = patchChanged(name, id, fields)
    const op: Op = { fields, before: shown?.before ?? {}, row: shown?.row ?? null }
    queue.ops.push(op)
    const send = () => api.update(id, patch, options)
    // A request that must leave now (the page is closing) does not wait for the others
    const request = options?.keepalive ? send() : queue.last.then(send)
    queue.last = request.catch(() => undefined)
    try {
      const item = await request
      queue.ops.splice(queue.ops.indexOf(op), 1)
      return written(queue.ops.length > 0 ? ({ ...item, ...Object.assign({}, ...queue.ops.map((o) => o.fields)) } as TItem) : item)
    } catch (error) {
      queue.ops.splice(queue.ops.indexOf(op), 1)
      undo(name, id, op, queue.ops)
      throw error
    } finally {
      if (queue.ops.length === 0 && queues.get(key) === queue) queues.delete(key)
    }
  }
  return {
    create: async (input) => written(await api.create(input)),
    update,
    remove: async (id) => {
      await api.remove(id)
      notifyChanged({ name, removedId: id })
      resource.effects?.deleted?.(String(id))
    },
    trash: (id) => update(id, { archived: true } as TUpdate),
    restore: (id) => update(id, { archived: false } as TUpdate),
  }
}

/** An update that was shown and has not been answered: its fields, the values they had, and the item as it was */
type Op = { fields: Record<string, unknown>; before: Record<string, unknown>; row: Record<string, unknown> | null }
/** The updates of each item that are on their way (`last`: the request the next one waits for) */
const queues = new Map<string, { last: Promise<unknown>; ops: Op[] }>()

/**
 * Takes back what a refused update showed. A field that a later update of the item also changes is not touched (the screen shows
 * that update's value): it is handed the value this one had, so if that one is refused too the field goes back to what the server has.
 * The others go back to their old value only where they still show this update's value. `rest`: the updates still waiting.
 */
function undo(name: string, id: number | string, op: Op, rest: Op[]) {
  const back: Record<string, unknown> = {}
  const expected: Record<string, unknown> = {}
  for (const field of Object.keys(op.fields)) {
    if (!(field in op.before)) continue
    const later = rest.find((o) => field in o.fields)
    if (later) later.before[field] = op.before[field]
    else {
      back[field] = op.before[field]
      expected[field] = op.fields[field]
    }
  }
  if (Object.keys(back).length === 0) return
  // The item left the lists it was shown in (it went to the Trash, or to another parent): it goes back as it was
  if (!patchChanged(name, id, back, expected) && op.row) notifyChanged({ name, item: { ...op.row, ...back } as { id: number | string } })
}

/** The writes of a resource (actionsOf), the same object for the component's life */
export function useResourceActions<TItem extends { id: number | string }, TListItem, TInput, TUpdate extends { archived?: boolean }, TFilter extends object>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
): ResourceActions<TItem, TInput, TUpdate> {
  return useMemo(() => actionsOf(resource), [resource])
}
