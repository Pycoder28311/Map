// The data hooks every screen of a resource uses. No cache: a list or an item loads when the component mounts and again when the
// resource changed (changes.ts); nothing else is kept. When a cache comes, it goes behind these same hooks.
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { isAbout, notifyChanged, subscribeChanges } from './changes'
import { initialItem, initialList, itemReducer, listReducer, type ItemState, type ListState } from './state'
import type { ResourceCore } from './types'

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)))

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

/** A resource's list, a page at a time: `loadMore` adds the next page. Loads again when the resource changes */
export function useResourceList<TItem, TListItem, TInput, TUpdate, TFilter extends { archived: boolean }>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
  { trashed = false, limit = PAGE_SIZE_DEFAULT, enabled = true }: ListOptions = {},
): ListResult<TListItem> {
  const [state, dispatch] = useReducer(listReducer<TListItem>, undefined, initialList<TListItem>)
  const [tick, refresh] = useReducer((n: number) => n + 1, 0)
  const request = useRef(0)
  const shown = useRef({ count: 0, nextCursor: null as string | null, busy: false })
  const filter = useMemo(() => ({ archived: trashed }) as TFilter, [trashed])

  useEffect(() => {
    shown.current = { count: state.items.length, nextCursor: state.nextCursor, busy: state.loadingMore || state.status !== 'ready' }
  }, [state])

  useEffect(() => subscribeChanges((event) => event.name === resource.name && refresh()), [resource.name])

  useEffect(() => {
    if (!enabled) return
    const id = ++request.current
    const controller = new AbortController()
    dispatch({ type: 'load', request: id })
    // A reload keeps as many items as are shown (one request), so a list does not shrink back to its first page
    const size = Math.min(PAGE_SIZE_MAX, Math.max(limit, shown.current.count))
    resource.api
      .list(filter, { limit: size }, controller.signal)
      .then((page) => dispatch({ type: 'loaded', request: id, page, append: false }))
      .catch((error) => !isAbort(error) && dispatch({ type: 'failed', request: id, error: asError(error) }))
    return () => controller.abort()
  }, [resource, filter, limit, enabled, tick])

  const loadMore = useCallback(() => {
    const { nextCursor, busy } = shown.current
    if (!nextCursor || busy) return
    const id = ++request.current
    dispatch({ type: 'more', request: id })
    resource.api
      .list(filter, { limit, cursor: nextCursor })
      .then((page) => dispatch({ type: 'loaded', request: id, page, append: true }))
      .catch((error) => dispatch({ type: 'failed', request: id, error: asError(error) }))
  }, [resource, filter, limit])

  return {
    items: state.items,
    status: state.status,
    error: state.error,
    hasMore: state.nextCursor !== null,
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

/** One item by id. Takes the server's version when it is written through useResourceActions, and is gone when it is deleted */
export function useResourceItem<TItem, TListItem, TInput, TUpdate, TFilter extends object>(
  resource: ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter>,
  id: number | string | undefined,
): ItemResult<TItem> {
  const [state, dispatch] = useReducer(itemReducer<TItem>, undefined, initialItem<TItem>)
  const [tick, refresh] = useReducer((n: number) => n + 1, 0)
  const request = useRef(0)

  useEffect(() => {
    if (id === undefined) return
    return subscribeChanges((event) => {
      if (event.name !== resource.name || !isAbout(event, id)) return
      if (event.removedId !== undefined) dispatch({ type: 'gone' })
      else dispatch({ type: 'set', item: event.item as TItem })
    })
  }, [resource.name, id])

  useEffect(() => {
    if (id === undefined) return
    const n = ++request.current
    const controller = new AbortController()
    dispatch({ type: 'load', request: n })
    resource.api
      .get(id, controller.signal)
      .then((item) => dispatch({ type: 'loaded', request: n, item }))
      .catch((error) => !isAbort(error) && dispatch({ type: 'failed', request: n, error: asError(error) }))
    return () => controller.abort()
  }, [resource, id, tick])

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
