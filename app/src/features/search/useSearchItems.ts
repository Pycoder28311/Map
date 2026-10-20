import { PAGE_SIZE_MAX } from '@map/shared/page-size'
import { useEffect, useReducer, useState } from 'react'
import { subscribeChanges } from '../../lib/resource/changes'
import type { AnyResource } from '../../resources/types'
import type { SearchItem } from './search'

/** Pages of a resource's list read for the search: at most this many (a page is the API's biggest) */
export const SEARCH_MAX_PAGES = 5

/** Reads a paged list from the start, a page at a time, up to `maxPages` pages. `capped`: there was more */
export async function readPages<T>(
  fetchPage: (cursor: string | null) => Promise<{ items: T[]; nextCursor: string | null }>,
  maxPages = SEARCH_MAX_PAGES,
): Promise<{ items: T[]; capped: boolean }> {
  const items: T[] = []
  let cursor: string | null = null
  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(cursor)
    items.push(...result.items)
    if (!result.nextCursor) return { items, capped: false }
    cursor = result.nextCursor
  }
  return { items, capped: true }
}

/** A resource's item as the search sees it: its title, and the subtitle (a note's preview) to find it by */
export const toSearchItem = (resource: AnyResource, item: Record<string, unknown> & { id: number | string }): SearchItem => ({
  id: String(item.id),
  kind: resource.panelType,
  name: resource.ui.row.title(item),
  text: resource.ui.row.subtitle?.(item) ?? '',
})

/**
 * The items of these resources for the search: their live (not archived) items, read when `enabled` (the search is open) and again
 * when one of them changed. Archived items are never asked for, so they can not be found.
 */
export function useSearchItems(resources: AnyResource[], enabled: boolean): { items: SearchItem[]; loading: boolean; capped: boolean } {
  const [state, setState] = useState({ items: [] as SearchItem[], loading: false, capped: false })
  const [tick, refresh] = useReducer((n: number) => n + 1, 0)

  useEffect(() => subscribeChanges((event) => resources.some((r) => r.name === event.name) && refresh()), [resources])

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    setState((s) => ({ ...s, loading: true }))
    Promise.all(
      resources.map(async (resource) => {
        const { items, capped } = await readPages((cursor) => resource.api.list({ archived: false }, { limit: PAGE_SIZE_MAX, cursor }, controller.signal))
        return { items: items.map((item) => toSearchItem(resource, item)), capped }
      }),
    )
      .then((parts) => setState({ items: parts.flatMap((p) => p.items), loading: false, capped: parts.some((p) => p.capped) }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState((s) => ({ ...s, loading: false }))
      })
    return () => controller.abort()
  }, [resources, enabled, tick])

  return state
}
