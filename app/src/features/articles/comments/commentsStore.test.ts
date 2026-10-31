import type { Comment } from '@map/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'
import { createCommentsStore } from './commentsStore'

const api = { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }
const comment = (id: number, extra: Partial<Comment> = {}): Comment => ({
  id,
  articleId: 1,
  parentId: null,
  depth: 1,
  author: { id: 'u', name: 'U', image: null },
  content: `c${id}`,
  replyCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  edited: false,
  can: { edit: true, remove: true },
  ...extra,
})
const page = (items: Comment[], nextCursor: string | null = null) => ({ items, nextCursor })
const contents = (s: ReturnType<typeof createCommentsStore>, ids = s.get().top.ids) => ids.map((id) => s.get().comments[id].content)

describe('commentsStore', () => {
  let store: ReturnType<typeof createCommentsStore>
  beforeEach(() => {
    vi.clearAllMocks()
    store = createCommentsStore(1, api)
  })

  it('reads the top comments a page at a time, once each', async () => {
    api.list.mockResolvedValueOnce(page([comment(5), comment(4)], 'c4')).mockResolvedValueOnce(page([comment(3)]))
    const first = store.loadTop()
    void store.loadTop()
    await first
    await store.loadTop()
    await store.loadTop()
    expect(api.list).toHaveBeenCalledTimes(2)
    expect(api.list).toHaveBeenLastCalledWith({ articleId: 1 }, { cursor: 'c4', limit: 20 })
    expect(contents(store)).toEqual(['c5', 'c4', 'c3'])
    expect(store.get().top).toMatchObject({ loaded: true, cursor: null })
  })

  it('a new top comment goes first; edits change it in place; nothing is read again', async () => {
    api.list.mockResolvedValue(page([comment(2)]))
    await store.loadTop()
    api.create.mockResolvedValue(comment(3, { content: 'new' }))
    await store.post('new')
    api.update.mockResolvedValue(comment(2, { content: 'changed', edited: true }))
    await store.edit(2, 'changed')
    expect(contents(store)).toEqual(['new', 'changed'])
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('a comment\'s replies are read when shown, oldest first; a reply goes last and the count goes up', async () => {
    api.list.mockResolvedValueOnce(page([comment(1, { replyCount: 2 })]))
    await store.loadTop()
    api.list.mockResolvedValueOnce(page([comment(2, { parentId: 1, depth: 2 }), comment(3, { parentId: 1, depth: 2 })]))
    store.toggle(1)
    await vi.waitFor(() => expect(store.get().replies[1]?.loaded).toBe(true))
    expect(api.list).toHaveBeenLastCalledWith({ articleId: 1, parentId: 1 }, { cursor: null, limit: 20 })
    api.create.mockResolvedValue(comment(4, { parentId: 1, depth: 2 }))
    await store.post('r', store.get().comments[1])
    expect(contents(store, store.get().replies[1].ids)).toEqual(['c2', 'c3', 'c4'])
    expect(store.get().comments[1].replyCount).toBe(3)
    store.toggle(1)
    expect(store.get().open[1]).toBe(false)
  })

  it('the first reply of a comment is shown without reading; a reply under unread ones reads them', async () => {
    api.list.mockResolvedValueOnce(page([comment(1), comment(5, { replyCount: 1 })]))
    await store.loadTop()
    api.create.mockResolvedValueOnce(comment(2, { parentId: 1, depth: 2 }))
    await store.post('first', store.get().comments[1])
    expect(store.get().open[1]).toBe(true)
    expect(contents(store, store.get().replies[1].ids)).toEqual(['c2'])
    expect(api.list).toHaveBeenCalledTimes(1)

    api.create.mockResolvedValueOnce(comment(7, { parentId: 5, depth: 2 }))
    api.list.mockResolvedValueOnce(page([comment(6, { parentId: 5, depth: 2 }), comment(7, { parentId: 5, depth: 2 })]))
    await store.post('second', store.get().comments[5])
    await vi.waitFor(() => expect(store.get().replies[5]?.loaded).toBe(true))
    expect(contents(store, store.get().replies[5].ids)).toEqual(['c6', 'c7'])
  })

  it('a reply to the last level lands under that comment\'s parent', async () => {
    api.list.mockResolvedValueOnce(page([comment(1, { depth: 4, replyCount: 1 })]))
    await store.loadTop()
    api.list.mockResolvedValueOnce(page([comment(2, { parentId: 1, depth: 5 })]))
    store.toggle(1)
    await vi.waitFor(() => expect(store.get().replies[1]?.loaded).toBe(true))
    api.create.mockResolvedValue(comment(3, { parentId: 1, depth: 5, content: '@U yes' }))
    await store.post('@U yes', store.get().comments[2])
    expect(api.create).toHaveBeenCalledWith({ articleId: 1, content: '@U yes', parentId: 2 })
    expect(contents(store, store.get().replies[1].ids)).toEqual(['c2', '@U yes'])
    expect(store.get().comments[1].replyCount).toBe(2)
  })

  it('deleting a comment takes everything under it; its parent has one reply less', async () => {
    api.list.mockResolvedValueOnce(page([comment(1, { replyCount: 1 })]))
    await store.loadTop()
    api.list.mockResolvedValueOnce(page([comment(2, { parentId: 1, depth: 2, replyCount: 1 })]))
    store.toggle(1)
    await vi.waitFor(() => expect(store.get().replies[1]?.loaded).toBe(true))
    api.list.mockResolvedValueOnce(page([comment(3, { parentId: 2, depth: 3 })]))
    store.toggle(2)
    await vi.waitFor(() => expect(store.get().replies[2]?.loaded).toBe(true))
    api.remove.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'))
    await store.remove(store.get().comments[2])
    expect(store.get().comments[2]).toBeUndefined()
    expect(store.get().comments[3]).toBeUndefined()
    expect(store.get().replies[2]).toBeUndefined()
    expect(store.get().replies[1].ids).toEqual([])
    expect(store.get().comments[1].replyCount).toBe(0)
  })

  it('a 404 closes the section; another failure can be tried again', async () => {
    api.list.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'Offline'))
    await store.loadTop()
    expect(store.get().top.error).toBe('Offline')
    api.list.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Not found'))
    await store.loadTop()
    expect(store.get().gone).toBe(true)
  })

  it('keeps the drafts while the modal is closed', () => {
    store.setDraft('new', 'half a thought')
    expect(store.draft('new')).toBe('half a thought')
    store.setDraft('new', '')
    expect(store.draft('new')).toBe('')
  })
})
