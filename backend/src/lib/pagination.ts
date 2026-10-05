import type { Page, PageQuery } from '@map/shared'
import { lt, type SQL } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { HttpError } from './errors'

/** Decoded page request: newest first, rows with id < cursor */
export type PageParams = { limit: number; cursor: number | null }

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
  cursor: query.cursor ? decodeCursor(query.cursor) : null,
})

/** WHERE condition for "older than the cursor"; undefined on the first page or without pagination */
export const beforeCursor = (idColumn: SQLiteColumn, page: PageParams | null): SQL | undefined =>
  page?.cursor ? lt(idColumn, page.cursor) : undefined

/** Rows to fetch: one extra row tells whether there is another page */
export const fetchLimit = (page: PageParams | null) => (page ? page.limit + 1 : undefined)

/** Turns fetched rows (newest first, up to limit + 1) into a page; without pagination returns all */
export function toPage<T>(rows: T[], page: PageParams | null, idOf: (row: T) => number): Page<T> {
  if (!page || rows.length <= page.limit) return { items: rows, nextCursor: null }
  const items = rows.slice(0, page.limit)
  return { items, nextCursor: encodeCursor(idOf(items[items.length - 1])) }
}

export const mapPage = <T, R>(page: Page<T>, fn: (item: T) => R): Page<R> => ({
  items: page.items.map(fn),
  nextCursor: page.nextCursor,
})
