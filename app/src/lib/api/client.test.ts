import { describe, expect, it, vi } from 'vitest'
import { ApiError, createRequest } from './client'

const reply = (status: number, body?: unknown, init: ResponseInit = {}) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' }, ...init })

function setup(res: Response | Error, config: Partial<Parameters<typeof createRequest>[0]> = {}) {
  const fetch = vi.fn(async () => {
    if (res instanceof Error) throw res
    return res
  })
  const request = createRequest({ baseUrl: '', fetch: fetch as unknown as typeof globalThis.fetch, ...config })
  return { request, fetch }
}

describe('request', () => {
  it('calls the path on the base URL, with the session cookie on the website', async () => {
    const { request, fetch } = setup(reply(200, { ok: true }), { baseUrl: 'https://site.test' })
    expect(await request('/api/notes')).toEqual({ ok: true })
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://site.test/api/notes')
    expect(init.credentials).toBe('include')
  })

  it('sends the bearer token and no cookies on desktop', async () => {
    const { request, fetch } = setup(reply(200, {}), { bearer: async () => 'tok' })
    await request('/api/notes')
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.credentials).toBe('omit')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('sends a JSON body with its content type, and none without one', async () => {
    const { request, fetch } = setup(reply(201, {}))
    await request('/api/notes', { method: 'POST', json: { title: 'a' } })
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1]
    expect(init.body).toBe('{"title":"a"}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    const other = setup(reply(200, {}))
    await other.request('/api/notes')
    expect((other.fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body).toBeUndefined()
  })

  it('answers undefined for 204', async () => {
    const { request } = setup(new Response(null, { status: 204 }))
    expect(await request('/api/notes/1', { method: 'DELETE' })).toBeUndefined()
  })

  it('turns the API error body into an ApiError', async () => {
    const { request } = setup(reply(400, { code: 'VALIDATION_FAILED', message: 'Invalid input', details: [{ path: 'title', message: 'Too long' }] }))
    const error = await request('/api/notes').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', message: 'Invalid input', details: [{ path: 'title', message: 'Too long' }] })
  })

  it('knows the status when the body is not JSON (a proxy error page)', async () => {
    const { request } = setup(new Response('<html>bad gateway</html>', { status: 502 }))
    expect(await request('/api/notes').catch((e) => e)).toMatchObject({ status: 502, code: 'ERROR' })
  })

  it('maps a missing code from the status', async () => {
    const { request } = setup(new Response('', { status: 404 }))
    expect(await request('/api/notes/9').catch((e) => e)).toMatchObject({ status: 404, code: 'NOT_FOUND' })
  })

  it('calls onUnauthorized on 401 and still throws', async () => {
    const onUnauthorized = vi.fn()
    const { request } = setup(reply(401, { code: 'UNAUTHORIZED', message: 'Sign in' }), { onUnauthorized })
    await expect(request('/api/notes')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('reports an unreachable server as status 0', async () => {
    const { request } = setup(new TypeError('Failed to fetch'))
    expect(await request('/api/notes').catch((e) => e)).toMatchObject({ status: 0, code: 'NETWORK' })
  })

  it('lets a cancelled call through as it is', async () => {
    const { request } = setup(new DOMException('aborted', 'AbortError'))
    expect(await request('/api/notes').catch((e) => e)).toMatchObject({ name: 'AbortError' })
  })
})
