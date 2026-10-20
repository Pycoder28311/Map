import { matchesFilter, previewOf, type Page, type Table } from '@map/shared'
import { compareFor } from '../resource/order'
import { ApiError } from './client'
import type { ResourceApi } from './resource'

type Row = Record<string, unknown> & { id: number }

/** A mock table's rows in this browser tab (tests start again with resetMocks) */
const tables = new Set<{ reset: () => void }>()

/** Tests only: every mock table back to its seed */
export const resetMocks = () => tables.forEach((t) => t.reset())

/**
 * A table's API in memory, for data that has no table on the server yet (the maps): the same calls as createResourceApi, the same
 * answers as the backend's ownedRepo (contract checks, defaults, dates, list order and filters, cursor pages, the preview, 404s),
 * so the hooks, the store and every screen use it unchanged. Moving it to the server is giving its resource the real API.
 * Nothing is saved: a reload starts again from `seed`.
 */
export function createMockApi(table: Table, seed: Record<string, unknown>[] = []): ResourceApi<Row, Row, Record<string, unknown>, Record<string, unknown>, Record<string, unknown>> {
  let rows: Row[] = []
  let nextId = 1
  const compare = compareFor(table.order)

  const now = () => new Date().toISOString()
  const make = (fields: Record<string, unknown>): Row => {
    const row: Row = {
      id: nextId++,
      ...Object.fromEntries(Object.entries(table.fields).map(([name, f]) => [name, f.default])),
      ...(table.preview ? { preview: '' } : {}),
      ...(table.link ? { objectType: null, objectId: null } : {}),
      archived: false,
      ...(table.order.pinned ? { pinned: false } : {}),
      ...(table.order.position ? { position: 0 } : {}),
      createdAt: now(),
      updatedAt: now(),
    }
    return withPreview({ ...row, ...fields })
  }
  const withPreview = (row: Row) => (table.preview ? { ...row, preview: previewOf(String(row[table.preview] ?? '')) } : row)
  // A list sends the preview instead of its field
  const listed = (row: Row) => {
    if (!table.preview) return row
    const { [table.preview]: _heavy, ...rest } = row
    return rest as Row
  }
  const find = (id: number | string) => {
    const row = rows.find((r) => String(r.id) === String(id))
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Not found')
    return row
  }
  const check = <T>(result: { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } }): T => {
    if (result.success) return result.data
    throw new ApiError(400, 'VALIDATION_FAILED', 'Invalid input', result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
  }

  const reset = () => {
    nextId = 1
    rows = seed.map(make)
  }
  reset()
  tables.add({ reset })

  return {
    async list(filter, page = {}) {
      const all = rows.filter((row) => matchesFilter(filter, row)).sort(compare)
      // The cursor is how many were sent before (the server's is by value; for a mock list an offset does)
      const from = page.cursor ? Number(page.cursor) : 0
      const to = page.limit ? from + page.limit : all.length
      return { items: all.slice(from, to).map(listed), nextCursor: to < all.length ? String(to) : null } satisfies Page<Row>
    },
    async get(id) {
      return find(id)
    },
    async create(input) {
      const row = make(check(table.input.safeParse(input)) as Record<string, unknown>)
      rows = [...rows, row]
      return row
    },
    async update(id, patch) {
      const fields = check(table.update.safeParse(patch)) as Record<string, unknown>
      const row = withPreview({ ...find(id), ...fields, updatedAt: now() })
      rows = rows.map((r) => (r.id === row.id ? row : r))
      return row
    },
    async remove(id) {
      const row = find(id)
      rows = rows.filter((r) => r !== row)
    },
  }
}
