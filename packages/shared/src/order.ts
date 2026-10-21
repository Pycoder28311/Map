import { z } from 'zod'
import { positionField } from './position'

/**
 * How a table's lists are ordered, as flags in the table's config (e.g. notesConfig.order). The four cases:
 *   { pinned: true,  position: true  }   pinned first, then position
 *   { pinned: false, position: true  }   by position
 *   { pinned: true,  position: false }   pinned first, then newest
 *   { pinned: false, position: false }   newest first
 * Change the flags and the contract (here), the table's columns and index, and the list query (backend/src/lib/sort.ts) follow.
 */
export type OrderSpec = { readonly pinned: boolean; readonly position: boolean }

/** The zod fields of the flags that are on: `...orderFields(config.order)` inside the table's field object */
export function orderFields<const O extends OrderSpec>(order: O) {
  return {
    ...(order.pinned ? { pinned: z.boolean() } : {}),
    /** Where the row sits in a list: a fractional-indexing key (position.ts), smaller first */
    ...(order.position ? { position: positionField } : {}),
  } as (O['pinned'] extends true ? { pinned: z.ZodBoolean } : unknown) & (O['position'] extends true ? { position: typeof positionField } : unknown)
}

/** The output fields of the flags that are on: `Note = { … } & OrderOutput<typeof notesConfig.order>` */
export type OrderOutput<O extends OrderSpec> = (O['pinned'] extends true ? { pinned: boolean } : unknown) &
  (O['position'] extends true ? { position: string } : unknown)
