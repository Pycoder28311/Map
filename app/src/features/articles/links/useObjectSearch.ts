import { useEffect, useReducer, useRef, useState } from 'react'
import { resourceByName } from '../../../resources/registry'
import type { ObjectType } from './linkHref'
import { nextToLoad, ObjectPages, PICKER_KINDS, type ObjectSource } from './objectSearch'

/** After this long the pickers start on fresh pages (what was read may have changed) */
const FRESH_MS = 5 * 60 * 1000

/** The kinds the picker offers that the app has */
export const pickerKinds = () => PICKER_KINDS.flatMap(({ type, resource }) => (resourceByName(resource) ? [{ type, resource: resourceByName(resource)! }] : []))

// The live objects and the archived ones (the Trash) are separate pages: the archived are read only when someone asks to see them
const shared: Record<'live' | 'archive', ObjectPages | null> = { live: null, archive: null }

/** The pages every picker of the app reads into (one Article link picker after another reads nothing again) */
function sharedPages(archived: boolean) {
  const which = archived ? 'archive' : 'live'
  const known = shared[which]
  if (known && Date.now() - known.made < FRESH_MS) return known
  const filter = { archived }
  const sources: ObjectSource[] = pickerKinds().map(({ type, resource }) => ({
    type,
    list: (page) => resource.api.list(filter, page) as ReturnType<ObjectSource['list']>,
    title: (item) => resource.ui.row.title(item),
    subtitle: (item) => resource.ui.row.subtitle?.(item),
  }))
  return (shared[which] = new ObjectPages(sources))
}

/**
 * The objects of these kinds matching the query, read a page at a time (objectSearch.ts): the first page of each kind at once, more
 * by themselves while a search has few matches, and the rest with `loadMore` (the list scrolled to its end) or `keepSearching`
 */
export function useObjectSearch(types: ObjectType[], query: string, exclude?: string, archived = false) {
  // Each is made once for as long as the picker is shown (fresh when made); the archive's only when it is asked for
  const [live] = useState(() => sharedPages(false))
  const [archive, setArchive] = useState<ObjectPages | null>(null)
  if (archived && !archive) setArchive(sharedPages(true))
  const pages = archived && archive ? archive : live
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => pages.subscribe(redraw), [pages])

  const typesKey = types.join(',')
  // Pages this search read by itself; a new query or kind starts again
  const read = useRef(0)
  useEffect(() => {
    read.current = 0
  }, [query, typesKey, archived])

  const hits = pages.results(types, query, exclude)
  useEffect(() => {
    const next = nextToLoad(pages, types, hits.length, read.current)
    if (!next) return
    read.current++
    void pages.loadMore(next)
  })

  const more = pages.more(types)
  return {
    hits,
    loading: pages.loading(types),
    error: pages.error(types),
    hasMore: more.length > 0,
    /** The next page (the list was scrolled to its end) */
    loadMore: () => {
      if (more[0] && !pages.loading(types)) void pages.loadMore(more[0])
    },
    /** A search that stopped by itself goes on */
    keepSearching: () => {
      read.current = 0
      redraw()
    },
  }
}
