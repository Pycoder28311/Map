import { afterEach, describe, expect, it, vi } from 'vitest'
import { actionsOf } from './hooks'
import { subscribeChanges, subscribePatches } from './changes'
import { createListStore, listKey, type ListSource } from './listStore'

type Note = { id: number; archived: boolean; pinned: boolean; position: string; title: string; content?: string }
const note = (id: number, extra: Partial<Note> = {}): Note => ({ id, archived: false, pinned: false, position: `a${id}`, title: `n${id}`, ...extra })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const live = listKey('notes', { archived: false })
const trash = listKey('notes', { archived: true })
const noop = () => {}

/** The write requests are held until the test answers them */
function setup(notes: Note[]) {
  const store = createListStore()
  const stops = [subscribeChanges((event) => store.apply(event)), subscribePatches((n, id, f, c) => store.patch(n, id, f, c))]
  const server = new Map(notes.map((n) => [n.id, n]))
  const calls: { id: number; patch: Partial<Note>; ok: (item: Note) => void; fail: (e: Error) => void }[] = []
  const api = {
    list: vi.fn(async (filter: { archived: boolean }) => ({ items: [...server.values()].filter((n) => n.archived === filter.archived), nextCursor: null })),
    update: vi.fn(
      (id: number, patch: Partial<Note>) =>
        new Promise<Note>((ok, fail) => {
          calls.push({
            id,
            patch,
            ok: (item) => ok(item),
            fail,
          })
        }),
    ),
  }
  const order = { pinned: true, position: true }
  const resource = { name: 'notes', api, list: { order, toItem: ({ content: _c, ...item }: Note) => item } }
  store.subscribe(live, resource as unknown as ListSource, { archived: false }, 20, noop)
  store.subscribe(trash, resource as unknown as ListSource, { archived: true }, 20, noop)
  const actions = actionsOf(resource as never) as unknown as { update(id: number, patch: Partial<Note>, options?: { keepalive?: boolean }): Promise<Note>; trash(id: number): Promise<Note> }
  const titles = (key = live) => (store.snapshot(key).items as Note[]).map((n) => n.title)
  /** The server answers the oldest request that is waiting: with the item as it now is, or with a refusal */
  const answer = async (ok = true) => {
    await flush() // the request is sent a moment after the call
    const call = calls.shift()!
    if (ok) {
      const next = { ...(server.get(call.id) ?? { id: call.id }), ...call.patch } as Note
      server.set(call.id, next)
      call.ok(next)
    } else call.fail(new Error('refused'))
  }
  return { store, api, actions, titles, answer, calls, stop: () => stops.forEach((s) => s()) }
}

let stop = () => {}
afterEach(() => stop())

describe('update shows its change before the server answers', () => {
  it('changes the lists at once and keeps the change when the server accepts it', async () => {
    const t = setup([note(1), note(2)])
    stop = t.stop
    await flush()
    const done = t.actions.update(1, { title: 'new' })
    expect(t.titles()).toEqual(['new', 'n2'])
    await t.answer()
    await done
    expect(t.titles()).toEqual(['new', 'n2'])
  })

  it('takes the change back when the server refuses, and the error reaches the caller', async () => {
    const t = setup([note(1), note(2)])
    stop = t.stop
    await flush()
    const done = t.actions.update(1, { title: 'new' })
    expect(t.titles()).toEqual(['new', 'n2'])
    await t.answer(false)
    await expect(done).rejects.toThrow('refused')
    expect(t.titles()).toEqual(['n1', 'n2'])
  })

  it('moves a trashed note to the Trash at once and back when refused', async () => {
    const t = setup([note(1), note(2)])
    stop = t.stop
    await flush()
    const done = t.actions.trash(1)
    expect(t.titles()).toEqual(['n2'])
    expect(t.titles(trash)).toEqual(['n1'])
    await t.answer(false)
    await expect(done).rejects.toThrow()
    expect(t.titles()).toEqual(['n1', 'n2'])
    expect(t.titles(trash)).toEqual([])
  })

  it('moves an item to its new place at once, and back when refused', async () => {
    const t = setup([note(1), note(2), note(3)])
    stop = t.stop
    await flush()
    const done = t.actions.update(3, { position: 'a1V' })
    expect(t.titles()).toEqual(['n1', 'n3', 'n2'])
    await t.answer(false)
    await expect(done).rejects.toThrow()
    expect(t.titles()).toEqual(['n1', 'n2', 'n3'])
  })

  it('does not read the lists again', async () => {
    const t = setup([note(1)])
    stop = t.stop
    await flush()
    const reads = t.api.list.mock.calls.length
    const done = t.actions.update(1, { title: 'new' })
    await t.answer()
    await done
    expect(t.api.list).toHaveBeenCalledTimes(reads)
  })

  it('sends the updates of one item one after the other', async () => {
    const t = setup([note(1)])
    stop = t.stop
    await flush()
    const a = t.actions.update(1, { title: 'a' })
    const b = t.actions.update(1, { title: 'b' })
    await flush()
    expect(t.calls).toHaveLength(1)
    await t.answer()
    await a
    await flush()
    expect(t.calls).toHaveLength(1)
    expect(t.titles()).toEqual(['b']) // the first answer does not flicker the second change away
    await t.answer()
    await b
    expect(t.titles()).toEqual(['b'])
  })

  it('keeps a later change when an earlier one is refused, and the server value when both are', async () => {
    const t = setup([note(1)])
    stop = t.stop
    await flush()
    const a = t.actions.update(1, { title: 'a' })
    const b = t.actions.update(1, { title: 'b' })
    a.catch(noop)
    b.catch(noop)
    await flush()
    await t.answer(false)
    await flush()
    expect(t.titles()).toEqual(['b'])
    await flush()
    await t.answer(false)
    await flush()
    expect(t.titles()).toEqual(['n1'])
  })

  it('takes back only the fields of the refused update', async () => {
    const t = setup([note(1)])
    stop = t.stop
    await flush()
    const a = t.actions.update(1, { pinned: true })
    const b = t.actions.update(1, { title: 'b' })
    a.catch(noop)
    await flush()
    await t.answer(false)
    await flush()
    expect((t.store.snapshot(live).items[0] as Note).pinned).toBe(false)
    expect(t.titles()).toEqual(['b'])
    await t.answer()
    await b
  })

  it('works as before for an item no list holds', async () => {
    const t = setup([note(1)])
    stop = t.stop
    await flush()
    const done = t.actions.update(9, { title: 'x' })
    await t.answer()
    expect(await done).toMatchObject({ id: 9, title: 'x' })
    expect(t.titles()).toEqual(['n1'])
  })
})
