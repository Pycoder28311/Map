import { describe, expect, it, vi } from 'vitest'
import { createResourceApi, toQuery } from './resource'

describe('toQuery', () => {
  it('writes the set values and skips the empty ones', () => {
    expect(toQuery({ archived: true, limit: 20, cursor: undefined, q: '', other: null })).toBe('?archived=true&limit=20')
    expect(toQuery({})).toBe('')
  })
})

describe('createResourceApi', () => {
  const call = vi.fn(async () => ({}) as never)
  const api = createResourceApi<unknown, unknown, { title: string }, { title?: string }, { archived: boolean }>('/api/notes', call as never)
  const last = () => call.mock.calls.at(-1) as unknown as [string, Record<string, unknown>]

  it('lists with the filter, the page size and the cursor', async () => {
    await api.list({ archived: true }, { limit: 30, cursor: 'abc' })
    expect(last()[0]).toBe('/api/notes?archived=true&limit=30&cursor=abc')
    await api.list({ archived: false })
    expect(last()[0]).toBe('/api/notes?archived=false')
  })

  it('gets one by id', async () => {
    await api.get(5)
    expect(last()[0]).toBe('/api/notes/5')
  })

  it('creates with POST', async () => {
    await api.create({ title: 'a' })
    expect(last()).toEqual(['/api/notes', { method: 'POST', json: { title: 'a' } }])
  })

  it('updates with PATCH and removes with DELETE', async () => {
    await api.update('7', { title: 'b' })
    expect(last()).toEqual(['/api/notes/7', { method: 'PATCH', json: { title: 'b' } }])
    await api.remove(7)
    expect(last()).toEqual(['/api/notes/7', { method: 'DELETE' }])
  })
})
