import type { Page, PageQuery } from '@map/shared'
import { lt, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { HttpError } from './errors'

/** Page request: the cursor is the opaque string of the previous page (see decodeCursor, and sort.ts for sorted lists) */
export type PageParams = { limit: number; cursor: string | null }

/** Cursors are opaque to clients (base64 of the last id on the page) */
export const encodeCursor = (id: number) => btoa(String(id))

export function decodeCursor(cursor: string): number {
  let id = Number.NaN
  try {
    id = Number(atob(cursor))
  } catch {
    // invalid base64: handled below
  }
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Invalid input', [{ path: 'cursor', message: 'Invalid cursor' }])
  }
  return id
}

export const toPageParams = (query: PageQuery): PageParams => ({
  limit: query.limit,
  cursor: query.cursor ?? null,
})

/** WHERE condition for "older than the cursor"; undefined on the first page or without pagination */
export const beforeCursor = (idColumn: SQLiteColumn, page: PageParams | null): SQL | undefined =>
  page?.cursor ? lt(idColumn, decodeCursor(page.cursor)) : undefined

/** Rows to fetch: one extra row tells whether there is another page */
export const fetchLimit = (page: PageParams | null) => (page ? page.limit + 1 : undefined)

/**
 * Turns fetched rows (up to limit + 1) into a page; without pagination returns all.
 * `cursorOf`: the id of a row (newest-first lists), or the finished cursor string (sorted lists: listSort().cursorOf)
 */
export function toPage<T>(rows: T[], page: PageParams | null, cursorOf: (row: T) => number | string): Page<T> {
  if (!page || rows.length <= page.limit) return { items: rows, nextCursor: null }
  const items = rows.slice(0, page.limit)
  const cursor = cursorOf(items[items.length - 1])
  return { items, nextCursor: typeof cursor === 'string' ? cursor : encodeCursor(cursor) }
}

export const mapPage = <T, R>(page: Page<T>, fn: (item: T) => R): Page<R> => ({
  items: page.items.map(fn),
  nextCursor: page.nextCursor,
})
