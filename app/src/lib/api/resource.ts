import type { Page } from '@map/shared'
import { request } from './client'

type RequestFn = typeof request

/** What a list call may ask besides the resource's own filter */
export type PageOptions = { limit?: number; cursor?: string | null }

// Method syntax on purpose: a resource with its own types (Item<'notes'>…) fits the registry's general type (parameters are checked loosely)
export type ResourceApi<TItem, TListItem, TInput, TUpdate, TFilter> = {
  list(filter: TFilter, page?: PageOptions, signal?: AbortSignal): Promise<Page<TListItem>>
  get(id: number | string, signal?: AbortSignal): Promise<TItem>
  create(input: TInput): Promise<TItem>
  /** `keepalive`: the call may finish after the page is gone (the browser limits its body to 64 KB) */
  update(id: number | string, patch: TUpdate, options?: { keepalive?: boolean }): Promise<TItem>
  remove(id: number | string): Promise<void>
}

/** ?a=1&b=true from an object: undefined, null and '' are left out */
export function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/**
 * The calls of one resource (a table's CRUD routes, backend crudRoutes): list (paged), get, create, update, remove. Typed by the
 * shared contract. Every resource gets its own from createResource (resources/createResource.ts): createResourceApi('/api/notes')
 */
export function createResourceApi<TItem, TListItem, TInput, TUpdate, TFilter extends object>(
  path: string,
  call: RequestFn = request,
): ResourceApi<TItem, TListItem, TInput, TUpdate, TFilter> {
  const one = (id: number | string) => `${path}/${encodeURIComponent(String(id))}`
  return {
    list: (filter, page = {}, signal) => call<Page<TListItem>>(`${path}${toQuery({ ...filter, limit: page.limit, cursor: page.cursor })}`, { signal }),
    get: (id, signal) => call<TItem>(one(id), { signal }),
    create: (input) => call<TItem>(path, { method: 'POST', json: input }),
    update: (id, patch, options) => call<TItem>(one(id), { method: 'PATCH', json: patch, ...(options?.keepalive ? { keepalive: true } : {}) }),
    remove: (id) => call<void>(one(id), { method: 'DELETE' }),
  }
}
