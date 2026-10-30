import type { Message } from '@map/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api/client'

const api = vi.hoisted(() => ({ get: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock('../../../lib/api/messages', () => ({ messagesApi: api, importMessages: vi.fn() }))

const { createMessage, forgetArticleMessages, loadMessage, peekMessage, removeMessage, updateMessage } = await import('./messagesStore')

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
  can: { edit: true, done: true, remove: true },
  ...extra,
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
})
