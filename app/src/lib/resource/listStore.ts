// The one place lists are loaded. Every screen that shows the same list (a resource and its filter) shares one entry, which holds the
// list from its start as far as it was read, and the cursor to go on from there. A screen that needs more items asks for the rest only
// (a second screen needing 100 when 20 are held reads the other 80), and a list that is complete is not read again.
// One item by id (the whole note, with its content) is shared the same way, while some screen reads it: two screens that show the
// same note ask once. Pure of React (listStore.test.ts); useResourceList, useResourceItem and useTrashedItems read it, ResourcesProvider owns it.
import type { Page } from '@map/shared'
import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import type { ChangeEvent } from './changes'
import { compareFor } from './order'
import { initialItem, initialList, itemReducer, listReducer, type ItemAction, type ItemState, type ListAction, type ListState } from './state'
import type { ListOrder } from './types'

/** What the store needs of a resource (any resource fits) */
export type ListSource = {
  name: string
  api: { list(filter: never, page?: { limit?: number; cursor?: string | null }, signal?: AbortSignal): Promise<Page<unknown>> }
  /** How a written item goes into its lists (ResourceCore.list); without it the lists load again */
  list?: { order: ListOrder; toItem(item: never): unknown }
}

/** What the store needs of a resource to read one item */
export type ItemSource = { name: string; api: { get(id: never, signal?: AbortSignal): Promise<unknown> } }

type ItemEntry = {
  source: ItemSource
  id: number | string
  state: ItemState<unknown>
  readers: Set<{ onChange: () => void }>
  controller: AbortController | null
}

type Row = Record<string, unknown> & { id: number | string }
const sameId = (a: Row, id: number | string) => String(a.id) === String(id)
/** Whether an item belongs in a list of this filter (e.g. { archived: false } holds the items that are not archived) */
const fits = (filter: object, item: Row) => Object.entries(filter).every(([name, value]) => item[name] === value)

/** How long a list that nobody was reading counts as fresh when it is read again (a change made here makes it stale at once) */
export const STALE_MS = 5 * 60 * 1000

/** A screen reading a list: it needs at least `count` items of it while it reads */
type Reader = { count: number; onChange: () => void }

type Entry = {
  source: ListSource
  filter: object
  state: ListState<unknown>
  readers: Set<Reader>
  /** The first-page request that is running (settles when done, also when it failed or was cancelled) */
  firstLoad: Promise<void> | null
  controller: AbortController | null
  /** The next-page request that is running, so two screens asking for more share it */
  more: Promise<boolean> | null
  loadedAt: number
  /** The resource changed while nobody read this list */
  stale: boolean
}

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
const asError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)))

/** The key of one list. The number of items is not in it: screens that want different amounts share the list */
export const listKey = (name: string, filter: object) => `${name}|${JSON.stringify(filter)}`

/** What a list that was never asked for looks like (one object, so a snapshot stays the same between reads) */
export const NO_LIST: ListState<never> = initialList<never>()
export const NO_ITEM: ItemState<never> = initialItem<never>()

/** The key of one item */
export const itemKey = (name: string, id: number | string) => `${name}/${encodeURIComponent(String(id))}`

export function createListStore({ now = Date.now, staleMs = STALE_MS }: { now?: () => number; staleMs?: number } = {}) {
  const entries = new Map<string, Entry>()
  const items = new Map<string, ItemEntry>()
  const watchers = new Set<() => void>()
  const manyCache = new Map<string, ListState<unknown>[]>()
  let request = 0

  /** The most items any reader of this list needs */
  const wanted = (entry: Entry) => Math.max(0, ...[...entry.readers].map((r) => r.count))
  const isStale = (entry: Entry) => !entry.state.loaded || entry.stale || now() - entry.loadedAt > staleMs

  function dispatch(entry: Entry, action: ListAction<unknown>) {
    entry.state = listReducer(entry.state, action)
    entry.readers.forEach((reader) => reader.onChange())
    watchers.forEach((watcher) => watcher())
  }

  /** Reads one more page after the items held. Resolves false when it failed or came back empty */
  function readMore(entry: Entry, size: number): Promise<boolean> {
    const cursor = entry.state.nextCursor
    const id = ++request
    dispatch(entry, { type: 'more', request: id })
    return entry.source.api
      .list(entry.filter as never, { limit: size, cursor })
      .then((page) => {
        dispatch(entry, { type: 'loaded', request: id, page, append: true })
        return page.items.length > 0
      })
      .catch((error) => {
        dispatch(entry, { type: 'failed', request: id, error: asError(error) })
        return false
      })
  }

  /** Makes the list hold at least `count` items (or all of it, if it is shorter): reads only the rest, after the cursor */
  async function fill(key: string, count: number): Promise<void> {
    const entry = entries.get(key)
    while (entry) {
      if (entry.firstLoad) await entry.firstLoad
      const { items, nextCursor } = entry.state
      if (!entry.state.loaded || items.length >= count || !nextCursor) return
      if (entry.more) {
        await entry.more
        continue
      }
      const running = (entry.more = readMore(entry, Math.min(PAGE_SIZE_MAX, count - items.length)))
      const ok = await running
      entry.more = null
      if (!ok) return
    }
  }

  /**
   * Reads the list from its start again. It keeps as many items as the readers need (the first request is one page, the rest follow
   * after its cursor), so a list does not shrink back to its first page
   */
  function load(key: string) {
    const entry = entries.get(key)
    if (!entry) return
    entry.controller?.abort()
    const controller = (entry.controller = new AbortController())
    const id = ++request
    dispatch(entry, { type: 'load', request: id })
    const settle = () => {
      if (entry.controller !== controller) return false
      entry.controller = null
      entry.firstLoad = null
      return true
    }
    entry.firstLoad = entry.source.api
      .list(entry.filter as never, { limit: Math.min(PAGE_SIZE_MAX, Math.max(wanted(entry), 1)) }, controller.signal)
      .then((page) => {
        if (!settle()) return
        entry.loadedAt = now()
        entry.stale = false
        dispatch(entry, { type: 'loaded', request: id, page, append: false })
        // Readers that held more than the first page get the rest
        void fill(key, wanted(entry))
      })
      .catch((error) => {
        if (isAbort(error) || !settle()) return
        dispatch(entry, { type: 'failed', request: id, error: asError(error) })
      })
  }

  function dispatchItem(entry: ItemEntry, action: ItemAction<unknown>) {
    entry.state = itemReducer(entry.state, action)
    entry.readers.forEach((reader) => reader.onChange())
  }

  function loadItem(key: string) {
    const entry = items.get(key)
    if (!entry) return
    entry.controller?.abort()
    const controller = (entry.controller = new AbortController())
    const id = ++request
    dispatchItem(entry, { type: 'load', request: id })
    entry.source.api
      .get(entry.id as never, controller.signal)
      .then((item) => {
        if (entry.controller === controller) entry.controller = null
        dispatchItem(entry, { type: 'loaded', request: id, item })
        dropIfIdle(key, entry)
      })
      .catch((error) => {
        if (isAbort(error)) return
        if (entry.controller === controller) entry.controller = null
        dispatchItem(entry, { type: 'failed', request: id, error: asError(error) })
        dropIfIdle(key, entry)
      })
  }

  /** An item is kept only while a screen reads it (an editor must open on what the server has now), or until its read is back */
  function dropIfIdle(key: string, entry: ItemEntry) {
    if (entry.readers.size === 0 && !entry.controller && items.get(key) === entry) items.delete(key)
  }

  /** Loads a list that is read now; one nobody reads is marked, and loads when it is read next */
  function refresh(key: string, entry: Entry) {
    if (entry.readers.size > 0) load(key)
    else entry.stale = true
  }

  return {
    /**
     * A screen reads a list and needs at least `count` items of it while it reads. A new list is loaded, one that is held but
     * short gets the rest after its cursor, and a complete one costs nothing. A list nobody was reading is loaded again only
     * when it went stale (STALE_MS, or its resource changed). Returns how to stop.
     */
    subscribe(key: string, source: ListSource, filter: object, count: number, onChange: () => void) {
      let entry = entries.get(key)
      if (!entry) {
        entry = { source, filter, state: initialList<unknown>(), readers: new Set(), firstLoad: null, controller: null, more: null, loadedAt: 0, stale: false }
        entries.set(key, entry)
      }
      const reader: Reader = { count, onChange }
      const alone = entry.readers.size === 0
      entry.readers.add(reader)
      if (!entry.firstLoad && (!entry.state.loaded || (alone && isStale(entry)))) load(key)
      else void fill(key, count)
      return () => {
        entry.readers.delete(reader)
      }
    },
    /**
     * A screen reads one item. The first one reads it; the others share that read and its answer. When the last one stops
     * the item is dropped (after its read, if it is still running, so a screen that comes right back shares it)
     */
    subscribeItem(source: ItemSource, id: number | string, onChange: () => void) {
      const key = itemKey(source.name, id)
      let entry = items.get(key)
      if (!entry) {
        entry = { source, id, state: initialItem<unknown>(), readers: new Set(), controller: null }
        items.set(key, entry)
      }
      const reader = { onChange }
      entry.readers.add(reader)
      if (!entry.controller && entry.state.status !== 'ready' && entry.state.status !== 'notFound') loadItem(key)
      return () => {
        entry.readers.delete(reader)
        dropIfIdle(key, entry)
      }
    },
    itemSnapshot: (key: string): ItemState<unknown> => items.get(key)?.state ?? NO_ITEM,
    loadItem,
    /** The list as it is now (the same object until it changes) */
    snapshot: (key: string): ListState<unknown> => entries.get(key)?.state ?? NO_LIST,
    /** Several lists at once (the same array until one of them changes) */
    snapshotMany(keys: string[]): ListState<unknown>[] {
      const id = keys.join('\n')
      const next = keys.map((key) => entries.get(key)?.state ?? NO_LIST)
      const last = manyCache.get(id)
      if (last && last.every((state, i) => state === next[i])) return last
      manyCache.set(id, next)
      return next
    },
    /** Called whenever any list changes (for a screen that reads several) */
    watchAll(onChange: () => void) {
      watchers.add(onChange)
      return () => {
        watchers.delete(onChange)
      }
    },
    /** Reads the list from its start again */
    load,
    /**
     * A write that succeeded (create, update or delete): the lists of the resource take the server's answer in, without reading
     * again. Each list of the resource takes the item out and puts it back where the server would list it (or leaves it out, if it
     * belongs after what the list holds, or to another filter: archived items go to the Trash's list). A list with a read
     * running is read again, since that read may have been answered before the write. Without enough to patch, the lists load again.
     */
    apply(event: ChangeEvent) {
      // An item being read takes the server's version, or is gone
      const changed = event.removedId ?? event.item?.id
      const entry = changed === undefined ? undefined : items.get(itemKey(event.name, changed))
      if (entry) dispatchItem(entry, event.removedId !== undefined ? { type: 'gone' } : { type: 'set', item: event.item })
      entries.forEach((entry, key) => {
        if (entry.source.name !== event.name) return
        const item = event.item as Row | undefined
        const patchable = event.removedId !== undefined || (item !== undefined && entry.source.list !== undefined)
        if (!patchable) return refresh(key, entry)
        if (!entry.state.loaded && !entry.controller) return // never read: it is read when it is next needed
        if (entry.controller || entry.more) return refresh(key, entry)
        const held = entry.state.items as Row[]
        const without = held.filter((row) => !sameId(row, (event.removedId ?? item!.id) as number | string))
        let next = without
        if (event.removedId === undefined && fits(entry.filter, item!)) {
          const list = entry.source.list!
          const row = list.toItem(item as never) as Row
          const before = compareFor(list.order)
          const last = without[without.length - 1]
          // After the last item held, in a list with more to read: it comes with the next page
          if (entry.state.nextCursor === null || !last || before(row, last) < 0) {
            const at = without.findIndex((other) => before(row, other) < 0)
            next = at < 0 ? [...without, row] : [...without.slice(0, at), row, ...without.slice(at)]
          }
        }
        if (next.length === held.length && next.every((row, i) => row === held[i])) return
        dispatch(entry, { type: 'items', items: next })
      })
    },
    /** A resource changed in a way that says nothing of what changed: its lists that are read load again, the others when they are read next */
    reloadResource(name: string) {
      entries.forEach((entry, key) => entry.source.name === name && refresh(key, entry))
    },
  }
}

export type ListStore = ReturnType<typeof createListStore>
