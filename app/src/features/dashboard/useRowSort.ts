import { useState } from 'react'
import { authClient } from '../../lib/auth-client'
import type { CardSort } from './sortByDate'

/** A row: its resource's name */
type RowId = string
type Sorts = Partial<Record<RowId, CardSort>>
const storageKey = (userId: string) => `map:row-sort:${userId}`

function load(userId: string | undefined): Sorts {
  if (!userId) return {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}')
    return parsed && typeof parsed === 'object' ? (parsed as Sorts) : {}
  } catch {
    return {}
  }
}

/** Each Dashboard row's sort (none: the server's order), kept in this browser per user */
export function useRowSort() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const [state, setState] = useState(() => ({ userId, sorts: load(userId) }))
  if (state.userId !== userId) setState({ userId, sorts: load(userId) })

  const setSort = (row: RowId, sort: CardSort | null) => {
    const { [row]: _, ...rest } = state.sorts
    const sorts = sort ? { ...rest, [row]: sort } : rest
    setState({ userId, sorts })
    if (!userId) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(sorts))
    } catch {
      // Storage full or blocked: kept until reload
    }
  }

  return { sortOf: (row: RowId): CardSort | null => state.sorts[row] ?? null, setSort }
}
