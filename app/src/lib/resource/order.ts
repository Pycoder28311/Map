// The order a list comes in from the server, as a comparison, so a written item can be put where the server would list it.
// The same rule as backend/src/lib/sort.ts (pure, order.test.ts): pinned first, then position, then id (ascending when there is a
// position, newest first when there is not).
import { comparePositions } from '@map/shared'
import type { ListOrder } from './types'

type Row = { id: number | string; pinned?: unknown; position?: unknown }

/** < 0 when `a` is listed before `b` */
export function compareFor(order: ListOrder): (a: Row, b: Row) => number {
  return (a, b) => {
    if (order.pinned) {
      const byPinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned))
      if (byPinned !== 0) return byPinned
    }
    if (order.position) {
      // Keys (shared/position.ts), compared by code units like the server's index
      const byPosition = comparePositions(String(a.position ?? ''), String(b.position ?? ''))
      if (byPosition !== 0) return byPosition
    }
    return order.position ? Number(a.id) - Number(b.id) : Number(b.id) - Number(a.id)
  }
}
