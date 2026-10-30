import { describe, expect, it, vi } from 'vitest'
import { createListStore, itemKey, listKey, STALE_MS, type ItemSource, type ListSource } from './listStore'

const page = (ids: number[], nextCursor: string | null = null) => ({ items: ids.map((id) => ({ id })), nextCursor })
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const filter = { archived: false }
const key = listKey('notes', filter)
const noop = () => {}

/** A server with `total` notes: answers any (limit, cursor) the way the API does */
function server(total: number, name = 'notes') {
  const list = vi.fn(async (_filter: unknown, p: { limit?: number; cursor?: string | null } = {}) => {
    const from = p.cursor ? Number(p.cursor) : 0
    const to = Math.min(total, from + (p.limit ?? total))
    return page(range(from + 1, to), to < total ? String(to) : null)
  })
  return { source: { name, api: { list } } as unknown as ListSource, list }
}

describe('createListStore', () => {
  it('asks the server once for screens that read the same list', async () => {
    const store = createListStore()
    const { source, list } = server(50)
    store.subscribe(key, source, filter, 20, noop)
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(1)
    expect(store.snapshot(key).items).toHaveLength(20)
  })

  it('keeps the same snapshot object until the list changes', async () => {
    const store = createListStore()
    store.subscribe(key, server(5).source, filter, 20, noop)
    await flush()
    expect(store.snapshot(key)).toBe(store.snapshot(key))
    expect(store.snapshotMany([key])).toBe(store.snapshotMany([key]))
  })

  it('reads only the rest when a screen needs more than is held', async () => {
    const store = createListStore()
    const { source, list } = server(130)
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    store.subscribe(key, source, filter, 100, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
    expect(list).toHaveBeenLastCalledWith(filter, { limit: 80, cursor: '20' })
    expect(store.snapshot(key).items.map((i) => (i as { id: number }).id)).toEqual(range(1, 100))
  })

  it('reads the pages after the cursor up to what is needed, and nothing when it is held', async () => {
    const store = createListStore()
    const { source, list } = server(250)
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    const stop = store.subscribe(key, source, filter, 230, noop)
    await flush()
    expect(store.snapshot(key).items).toHaveLength(230)
    expect(list.mock.calls.map(([, p]) => p)).toEqual([{ limit: 20 }, { limit: 100, cursor: '20' }, { limit: 100, cursor: '120' }, { limit: 10, cursor: '220' }])
    stop()
    const calls = list.mock.calls.length
    store.subscribe(key, source, filter, 230, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(calls)
  })

  it('stops when the list is complete, without asking again', async () => {
    const store = createListStore()
    const { source, list } = server(30)
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    store.subscribe(key, source, filter, 100, noop)
    await flush()
    expect(store.snapshot(key).items).toHaveLength(30)
    expect(store.snapshot(key).nextCursor).toBeNull()
    store.subscribe(key, source, filter, 100, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('shares one request when two screens ask for more at once', async () => {
    const store = createListStore()
    const { source, list } = server(130)
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    store.subscribe(key, source, filter, 100, noop)
    store.subscribe(key, source, filter, 100, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('does not read an idle list again when it is read next (the Trash opened twice)', async () => {
    const store = createListStore()
    const { source, list } = server(3)
    const trashed = { archived: true }
    const trashKey = listKey('notes', trashed)
    store.subscribe(trashKey, source, trashed, 100, noop)()
    await flush()
    store.subscribe(trashKey, source, trashed, 100, noop)()
    await flush()
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('reads an idle list again when its resource changed, or after it went stale', async () => {
    let time = 0
    const store = createListStore({ now: () => time })
    const { source, list } = server(3)
    store.subscribe(key, source, filter, 20, noop)()
    await flush()
    store.reloadResource('notes')
    expect(list).toHaveBeenCalledTimes(1)
    store.subscribe(key, source, filter, 20, noop)()
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
    time += STALE_MS + 1
    store.subscribe(key, source, filter, 20, noop)()
    await flush()
    expect(list).toHaveBeenCalledTimes(3)
  })

  it('loads the lists that are read when the resource changed, and keeps what the readers need', async () => {
    const store = createListStore()
    const { source, list } = server(150)
    store.subscribe(key, source, filter, 120, noop)
    await flush()
    store.reloadResource('notes')
    await flush()
    expect(store.snapshot(key).items).toHaveLength(120)
    expect(list.mock.calls.map(([, p]) => p)).toEqual([{ limit: 100 }, { limit: 20, cursor: '100' }, { limit: 100 }, { limit: 20, cursor: '100' }])
  })

  it('loads the live and the trashed list separately', async () => {
    const store = createListStore()
    const { source, list } = server(5)
    store.subscribe(key, source, filter, 20, noop)
    store.subscribe(listKey('notes', { archived: true }), source, { archived: true }, 100, noop)
    await flush()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('does not load again while its first request is still running', () => {
    const store = createListStore()
    const { source, list } = server(5)
    store.subscribe(key, source, filter, 20, noop)()
    store.subscribe(key, source, filter, 20, noop)
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('says it could not load, and loads again on request or when it is read next', async () => {
    const store = createListStore()
    const list = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(page([1]))
    const source = { name: 'notes', api: { list } } as unknown as ListSource
    store.subscribe(key, source, filter, 20, noop)()
    await flush()
    expect(store.snapshot(key).status).toBe('error')
    store.subscribe(key, source, filter, 20, noop)
    await flush()
    expect(store.snapshot(key).status).toBe('ready')
  })

  it('stops reading more when a page fails, and keeps what it has', async () => {
    const store = createListStore()
    const list = vi.fn().mockResolvedValueOnce(page([1], 'c1')).mockRejectedValueOnce(new Error('down'))
    store.subscribe(key, { name: 'notes', api: { list } } as unknown as ListSource, filter, 5, noop)
    await flush()
    expect(store.snapshot(key).items).toHaveLength(1)
    expect(store.snapshot(key).error?.message).toBe('down')
    expect(list).toHaveBeenCalledTimes(2)
  })

  describe('apply (a write that succeeded)', () => {
    type Item = { id: number; archived: boolean; pinned: boolean; position: number; title: string }
    const note = (id: number, extra: Partial<Item> = {}): Item => ({ id, archived: false, pinned: false, position: 0, title: `n${id}`, ...extra })
    const ids = (store: ReturnType<typeof createListStore>, k = key) => store.snapshot(k).items.map((i) => (i as Item).id)

    /** Notes 1..total on the server, in the notes order (pinned, position, id) */
    function notesServer(total: number, held = total) {
      const all = range(1, total).map((id) => note(id))
      const list = vi.fn(async (_f: unknown, p: { limit?: number; cursor?: string | null } = {}) => {
        const from = p.cursor ? Number(p.cursor) : 0
        const to = Math.min(total, from + (p.limit ?? total))
        return { items: all.slice(from, to), nextCursor: to < total ? String(to) : null }
      })
      const source = { name: 'notes', api: { list }, list: { order: { pinned: true, position: true }, toItem: ({ content: _c, ...item }: Item & { content?: string }) => item } } as unknown as ListSource
      return { source, list, held }
    }
    const loaded = async (total: number, count = total) => {
      const store = createListStore()
      const s = notesServer(total)
      store.subscribe(key, s.source, filter, count, noop)
      await flush()
      return { store, ...s }
    }

    it('puts a created note in its place without reading again', async () => {
      const { store, list } = await loaded(3)
      store.apply({ name: 'notes', item: { ...note(4), content: '<p>x</p>' } as never })
      expect(ids(store)).toEqual([1, 2, 3, 4])
      expect((store.snapshot(key).items[3] as Record<string, unknown>).content).toBeUndefined()
      expect(list).toHaveBeenCalledTimes(1)
    })

    it('puts a pinned note first', async () => {
      const { store } = await loaded(3)
      store.apply({ name: 'notes', item: note(2, { pinned: true }) as never })
      expect(ids(store)).toEqual([2, 1, 3])
    })

    it('replaces an updated note in place', async () => {
      const { store, list } = await loaded(3)
      store.apply({ name: 'notes', item: note(2, { title: 'new' }) as never })
      expect(ids(store)).toEqual([1, 2, 3])
      expect((store.snapshot(key).items[1] as Item).title).toBe('new')
      expect(list).toHaveBeenCalledTimes(1)
    })

    it('never puts someone else\'s shared note into the user\'s lists (an editor saved it)', async () => {
      const { store, list } = await loaded(3)
      store.apply({ name: 'notes', item: { id: 7, archived: false, title: 'theirs', access: 'editor' } as never })
      expect(ids(store)).toEqual([1, 2, 3])
      store.apply({ name: 'notes', item: note(8, { access: 'owner' } as never) as never })
      expect(ids(store)).toEqual([1, 2, 3, 8])
      expect(list).toHaveBeenCalledTimes(1)
    })

    it('removes a deleted note', async () => {
      const { store, list } = await loaded(3)
      store.apply({ name: 'notes', removedId: 2 })
      expect(ids(store)).toEqual([1, 3])
      expect(list).toHaveBeenCalledTimes(1)
    })

    it('moves a trashed note from the live list to the Trash list, and back', async () => {
      const store = createListStore()
      const s = notesServer(3)
      const trashed = { archived: true }
      const trashKey = listKey('notes', trashed)
      const trashList = { items: [note(9, { archived: true })], nextCursor: null }
      const source = { ...s.source, api: { list: vi.fn(async (f: { archived: boolean }) => (f.archived ? trashList : await s.list(f))) } } as unknown as ListSource
      store.subscribe(key, source, filter, 20, noop)
      store.subscribe(trashKey, source, trashed, 100, noop)
      await flush()
      store.apply({ name: 'notes', item: note(2, { archived: true }) as never })
      expect(ids(store)).toEqual([1, 3])
      expect(ids(store, trashKey)).toEqual([2, 9])
      store.apply({ name: 'notes', item: note(2) as never })
      expect(ids(store)).toEqual([1, 2, 3])
      expect(ids(store, trashKey)).toEqual([9])
    })

    it('leaves out a note that belongs after what a longer list holds (it comes with the next page)', async () => {
      const { store, list } = await loaded(50, 20)
      expect(store.snapshot(key).nextCursor).toBe('20')
      store.apply({ name: 'notes', item: note(51) as never })
      expect(ids(store)).toEqual(range(1, 20))
      store.apply({ name: 'notes', item: note(7, { pinned: true }) as never })
      expect(ids(store).slice(0, 3)).toEqual([7, 1, 2])
      expect(ids(store)).toHaveLength(20)
      expect(list).toHaveBeenCalledTimes(1)
    })

    it('drops a held note that now belongs after what the list holds', async () => {
      const { store } = await loaded(50, 20)
      store.apply({ name: 'notes', item: note(3, { position: 99 }) as never })
      expect(ids(store)).toEqual([1, 2, ...range(4, 20)])
    })

    it('reads again when a read was running (it may carry the old data)', async () => {
      const store = createListStore()
      const { source, list } = notesServer(3)
      store.subscribe(key, source, filter, 20, noop)
      store.apply({ name: 'notes', removedId: 2 })
      await flush()
      expect(list).toHaveBeenCalledTimes(2)
    })

    it('does nothing for a list that was never read', () => {
      const store = createListStore()
      store.apply({ name: 'notes', removedId: 2 })
      expect(store.snapshot(key).items).toEqual([])
    })

    it('reads again when the resource cannot say where an item goes, or the news carries no item', async () => {
      const store = createListStore()
      const { source, list } = server(3)
      store.subscribe(key, source, filter, 20, noop)
      await flush()
      store.apply({ name: 'notes', item: { id: 4 } })
      await flush()
      expect(list).toHaveBeenCalledTimes(2)
      store.apply({ name: 'notes' })
      await flush()
      expect(list).toHaveBeenCalledTimes(3)
    })
  })

  describe('items', () => {
    const itemSource = (get = vi.fn(async (id: number | string) => ({ id, title: `n${id}`, content: 'x' }))) => ({ source: { name: 'notes', api: { get } } as unknown as ItemSource, get })
    const k = itemKey('notes', 1)

    it('reads one item once for screens that show it at the same time', async () => {
      const store = createListStore()
      const { source, get } = itemSource()
      store.subscribeItem(source, 1, noop)
      store.subscribeItem(source, 1, noop)
      await flush()
      expect(get).toHaveBeenCalledTimes(1)
      expect(store.itemSnapshot(k).status).toBe('ready')
    })

    it('shares the read when a screen comes right back, and while another screen still reads it', async () => {
      const store = createListStore()
      const { source, get } = itemSource()
      store.subscribeItem(source, 1, noop)()
      store.subscribeItem(source, 1, noop)
      await flush()
      expect(get).toHaveBeenCalledTimes(1)
      store.subscribeItem(source, 1, noop)()
      store.subscribeItem(source, 1, noop)
      await flush()
      expect(get).toHaveBeenCalledTimes(1) // still read by the first of these two
    })

    it('opens on what the server has now: an item nobody reads is not kept', async () => {
      const store = createListStore()
      const { source, get } = itemSource()
      const stop = store.subscribeItem(source, 1, noop)
      await flush()
      stop()
      expect(store.itemSnapshot(k).item).toBeNull()
      store.subscribeItem(source, 1, noop)
      await flush()
      expect(get).toHaveBeenCalledTimes(2)
    })

    it('opens on an item the server just answered with (a create) without reading it, and drops it with its last screen', async () => {
      const store = createListStore()
      const { source, get } = itemSource()
      store.seedItem(source, { id: 1, title: 'made' } as never)
      const stop = store.subscribeItem(source, 1, noop)
      await flush()
      expect(get).not.toHaveBeenCalled()
      expect((store.itemSnapshot(k).item as { title: string }).title).toBe('made')
      store.apply({ name: 'notes', item: { id: 1, title: 'typed' } as never })
      expect((store.itemSnapshot(k).item as { title: string }).title).toBe('typed')
      stop()
      expect(store.itemSnapshot(k).item).toBeNull()
    })

    it('does not seed over an item that is already held', async () => {
      const store = createListStore()
      const { source } = itemSource()
      store.subscribeItem(source, 1, noop)
      await flush()
      store.seedItem(source, { id: 1, title: 'other' } as never)
      expect((store.itemSnapshot(k).item as { title: string }).title).toBe('n1')
    })

    it('takes the server version of a write, and is gone when deleted, without reading', async () => {
      const store = createListStore()
      const { source, get } = itemSource()
      store.subscribeItem(source, 1, noop)
      await flush()
      store.apply({ name: 'notes', item: { id: 1, title: 'new' } as never })
      expect((store.itemSnapshot(k).item as { title: string }).title).toBe('new')
      store.apply({ name: 'notes', removedId: 1 })
      expect(store.itemSnapshot(k).status).toBe('notFound')
      expect(get).toHaveBeenCalledTimes(1)
    })
  })

  describe('filters and lookup', () => {
    type Row = { id: number; archived: boolean; objectType: string | null; objectId: number | null; pinned: boolean; position: number }
    const row = (id: number, extra: Partial<Row> = {}): Row => ({ id, archived: false, objectType: null, objectId: null, pinned: false, position: 0, ...extra })
    function folders(rows: Row[]) {
      const list = vi.fn(async (f: Record<string, unknown>) => ({
        items: rows.filter((r) => r.archived === f.archived && (f.objectType !== 'none' || r.objectType === null)),
        nextCursor: null,
      }))
      const source = { name: 'folders', api: { list }, list: { order: { pinned: true, position: true }, toItem: (i: Row) => i } } as unknown as ListSource
      return { source, list }
    }

    it('keeps a filtered list apart, and moves a written item out of it when it gets a parent', async () => {
      const store = createListStore()
      const { source, list } = folders([row(1), row(2, { objectType: 'project', objectId: 5 })])
      const orphans = { archived: false, objectType: 'none' }
      const orphansKey = listKey('folders', orphans)
      store.subscribe(orphansKey, source, orphans, 20, noop)
      store.subscribe(listKey('folders', filter), source, filter, 20, noop)
      await flush()
      expect(list).toHaveBeenCalledTimes(2)
      expect(store.snapshot(orphansKey).items.map((i) => (i as Row).id)).toEqual([1])
      store.apply({ name: 'folders', item: row(1, { objectType: 'folder', objectId: 9 }) as never })
      expect(store.snapshot(orphansKey).items).toEqual([])
      store.apply({ name: 'folders', item: row(2) as never })
      expect(store.snapshot(orphansKey).items.map((i) => (i as Row).id)).toEqual([2])
      expect(list).toHaveBeenCalledTimes(2)
    })

    it('looks an item up in the lists it holds, without a request', async () => {
      const store = createListStore()
      expect(store.lookup('folders', 1)).toBeNull()
      const { source } = folders([row(1)])
      const all = listKey('folders', filter)
      store.subscribe(all, source, filter, 20, noop)
      expect(store.lookup('folders', 1)).toBe('wait')
      await flush()
      expect(store.lookup('folders', 1)).toMatchObject({ id: 1 })
      // The whole live list is loaded and complete: an item it lacks is gone
      expect(store.lookup('folders', 7)).toBe('gone')
    })

    it('does not call an item gone from a filtered list only', async () => {
      const store = createListStore()
      const { source } = folders([row(1)])
      const orphans = { archived: false, objectType: 'none' }
      store.subscribe(listKey('folders', orphans), source, orphans, 20, noop)
      await flush()
      expect(store.lookup('folders', 7)).toBeNull()
    })
  })
})
