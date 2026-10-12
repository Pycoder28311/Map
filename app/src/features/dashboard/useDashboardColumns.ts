import { useState } from 'react'
import { authClient } from '../../lib/auth-client'
import { useMockProjects } from '../../mocks/projectsStore'
import { snapshotBlocks } from './blockFlip'
import { moveColumn, pickColumn, validColumns, type ColumnId } from './columns'

const storageKey = (userId: string) => `map:dash-columns:${userId}`

function load(userId: string | undefined): unknown {
  if (!userId) return undefined
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId)) ?? 'null')
  } catch {
    return undefined
  }
}

/**
 * The Dashboard's columns (which list each shows, in order), kept in this browser per user. Gone
 * projects fall back to a default list (validColumns). Every change glides (blockFlip.ts).
 */
export function useDashboardColumns() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const projects = useMockProjects()
  const projectIds = projects.map((p) => p.id)
  // Read once per user; the stored value is made valid on every render (projects come and go)
  const [stored, setStored] = useState<{ userId: string | undefined; value: unknown }>(() => ({ userId, value: load(userId) }))
  if (stored.userId !== userId) setStored({ userId, value: load(userId) })
  const columns = validColumns(stored.value, projectIds)

  const change = (next: ColumnId[]) => {
    if (next === columns) return
    snapshotBlocks()
    setStored({ userId, value: next })
    if (!userId) return
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next))
    } catch {
      // Storage full or blocked: kept until reload
    }
  }

  return {
    columns,
    projects,
    /** Column i shows `id` (swaps with the column already showing it) */
    pick: (i: number, id: ColumnId) => change(pickColumn(columns, i, id)),
    /** Column `from` dropped at `to` */
    move: (from: number, to: number) => change(moveColumn(columns, from, to)),
  }
}
