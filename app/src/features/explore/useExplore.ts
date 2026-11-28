// The Explore page's list (docs/plans/41): the search and the type live in the page's address (/explore?q=…&type=…), so a search can be
// shared and survives Back. The first page is read when they change (the search 300 ms after the last key), Load more reads the next.
import { EXPLORABLE, type ExplorableName, type ExploreItem } from '@map/shared'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { exploreApi } from '../../lib/api/explore'

const PAGE = 24
const DEBOUNCE_MS = 300

type List = { items: ExploreItem[]; cursor: string | null; status: 'loading' | 'ready' | 'error'; error: string | null; more: boolean }

const message = (e: unknown) => (e instanceof Error ? e.message : 'Could not load')

export function useExplore() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const typeParam = params.get('type')
  const type = (EXPLORABLE as readonly string[]).includes(typeParam ?? '') ? (typeParam as ExplorableName) : undefined
  // What is typed now (the address follows 300 ms after the last key)
  const [text, setText] = useState(q)
  const [list, setList] = useState<List>({ items: [], cursor: null, status: 'loading', error: null, more: false })
  const [attempt, setAttempt] = useState(0)

  const setParam = useCallback(
    (key: 'q' | 'type', value: string | undefined) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value) next.set(key, value)
          else next.delete(key)
          return next
        },
        { replace: key === 'q' },
      ),
    [setParams],
  )

  // The address follows the field
  useEffect(() => {
    if (text.trim() === q) return
    const id = window.setTimeout(() => setParam('q', text.trim() || undefined), DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [text, q, setParam])

  // The first page, again whenever the search or the type changes
  useEffect(() => {
    let live = true
    exploreApi.list({ q: q || undefined, type }, { limit: PAGE }).then(
      (page) => live && setList({ items: page.items, cursor: page.nextCursor, status: 'ready', error: null, more: false }),
      (e: unknown) => live && setList((l) => ({ ...l, status: 'error', error: message(e), more: false })),
    )
    return () => {
      live = false
    }
  }, [q, type, attempt])

  const loadMore = async () => {
    if (!list.cursor || list.more) return
    setList((l) => ({ ...l, more: true }))
    try {
      const page = await exploreApi.list({ q: q || undefined, type }, { limit: PAGE, cursor: list.cursor })
      setList((l) => ({ ...l, items: [...l.items, ...page.items], cursor: page.nextCursor, more: false }))
    } catch (e) {
      setList((l) => ({ ...l, more: false, error: message(e) }))
    }
  }

  return {
    ...list,
    q,
    text,
    setText,
    type,
    setType: (t: ExplorableName | undefined) => {
      setList((l) => ({ ...l, status: 'loading' }))
      setParam('type', t)
    },
    loadMore,
    retry: () => {
      setList((l) => ({ ...l, status: 'loading', error: null }))
      setAttempt((a) => a + 1)
    },
  }
}
