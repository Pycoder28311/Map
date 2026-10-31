import type { Message, MessageReply } from '@map/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
const replies = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('../../../lib/api/messages', () => ({ messagesApi: api, messageRepliesApi: replies, importMessages: vi.fn() }))

const { addReply, createMessage, forgetArticleMessages, loadEarlierReplies, loadMessage, peekMessage, removeMessage, removeReply, updateMessage, updateReply } = await import('./messagesStore')

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const message = (id: number, extra: Partial<Message> = {}): Message => ({
  id,
  articleId: 1,
  author: { id: 'u', name: 'U', image: null },
  title: `m${id}`,
  content: '',
  done: false,
  doneAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  // (as GET /api/messages/:id answers; a list's message has none)
  replies: [],
  repliesCursor: null,
  can: { edit: true, done: true, remove: true, reply: true },
  ...extra,
})
const reply = (id: number, content = `r${id}`): MessageReply => ({
  id,
  messageId: 20,
  author: null,
  content,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  can: { edit: true, remove: true },
})

describe('messagesStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    forgetArticleMessages(1)
  })

  it('reads a message once, also when it is opened twice at the same time', async () => {
    api.get.mockResolvedValue(message(10))
    loadMessage(10)
    loadMessage(10)
    expect(peekMessage(10)).toEqual({ status: 'loading' })
    await flush()
    loadMessage(10)
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(peekMessage(10)).toMatchObject({ status: 'ready', message: { title: 'm10' } })
  })

  it('a 404 is gone; another failure can be tried again', async () => {
    api.get.mockRejectedValueOnce(new ApiError(404, 'NOT_FOUND', 'Not found'))
    loadMessage(11)
    await flush()
    expect(peekMessage(11)).toEqual({ status: 'gone' })

    api.get.mockRejectedValueOnce(new ApiError(0, 'NETWORK', 'Offline')).mockResolvedValueOnce(message(12))
    loadMessage(12)
    await flush()
    expect(peekMessage(12)).toEqual({ status: 'error', error: 'Offline' })
    loadMessage(12, true)
    await flush()
    expect(peekMessage(12)).toMatchObject({ status: 'ready' })
  })

  it('writes put the answer in, without reading', async () => {
    api.create.mockResolvedValue(message(13, { title: 'new' }))
    await createMessage(1, 'new', '')
    expect(peekMessage(13)).toMatchObject({ status: 'ready', message: { title: 'new' } })
    api.update.mockResolvedValue(message(13, { done: true }))
    await updateMessage(13, { done: true })
    expect(peekMessage(13)).toMatchObject({ message: { done: true } })
    api.remove.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Not found'))
    await removeMessage(13)
    expect(peekMessage(13)).toEqual({ status: 'gone' })
    expect(api.get).not.toHaveBeenCalled()
  })

  it('forgets an article\'s messages when its page closes (opened again, they are read fresh)', async () => {
    api.get.mockResolvedValue(message(14))
    loadMessage(14)
    await flush()
    forgetArticleMessages(1)
    expect(peekMessage(14)).toBeUndefined()
  })

  it('replies: come with the message; writes and earlier pages go into it, and a message update keeps them', async () => {
    api.get.mockResolvedValue(message(20, { replies: [reply(2), reply(1)], repliesCursor: 'c1' }))
    loadMessage(20)
    await flush()
    replies.create.mockResolvedValue(reply(3))
    await addReply(20, 'r3')
    replies.update.mockResolvedValue(reply(2, 'changed'))
    await updateReply(20, 2, 'changed')
    replies.list.mockResolvedValue({ items: [reply(1), reply(0)], nextCursor: null })
    await loadEarlierReplies(20)
    replies.remove.mockResolvedValue(undefined)
    await removeReply(20, 1)
    api.update.mockResolvedValue(message(20, { done: true, replies: undefined, repliesCursor: undefined }))
    await updateMessage(20, { done: true })
    const state = peekMessage(20)
    expect(state?.status === 'ready' && state.message.replies!.map((r) => r.content)).toEqual(['r3', 'changed', 'r0'])
    expect(state).toMatchObject({ message: { done: true, repliesCursor: null } })
    expect(replies.list).toHaveBeenCalledWith({ messageId: 20 }, { cursor: 'c1', limit: 20 })
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('a message known from a list (no replies) is read once more when opened, shown meanwhile; a new one is not', async () => {
    const { rememberMessage } = await import('./messagesStore')
    rememberMessage(message(30, { replies: undefined, repliesCursor: undefined }))
    api.get.mockResolvedValue(message(30, { replies: [reply(1)], repliesCursor: null }))
    loadMessage(30)
    loadMessage(30)
    expect(peekMessage(30)).toMatchObject({ status: 'ready' })
    await flush()
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(peekMessage(30)).toMatchObject({ message: { replies: [{ id: 1 }] } })
    api.create.mockResolvedValue(message(31))
    await createMessage(1, 'm', '')
    loadMessage(31)
    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
