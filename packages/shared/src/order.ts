import { z } from 'zod'

/**
 * How a table's lists are ordered, as flags in the table's config (e.g. notesConfig.order). The four cases:
 *   { pinned: true,  position: true  }   pinned first, then position
 *   { pinned: false, position: true  }   by position
 *   { pinned: true,  position: false }   pinned first, then newest
 *   { pinned: false, position: false }   newest first
 * Change the flags and the contract (here), the table's columns and index, and the list query (backend/src/lib/sort.ts) follow.
 */
export type OrderSpec = { readonly pinned: boolean; readonly position: boolean }

export const POSITION_MAX = 1_000_000_000

/** The zod fields of the flags that are on: `...orderFields(config.order)` inside the table's field object */
export function orderFields<const O extends OrderSpec>(order: O) {
  return {
    ...(order.pinned ? { pinned: z.boolean() } : {}),
    /** Where the row sits in a list (smaller first) */
    ...(order.position ? { position: z.number().int().min(0).max(POSITION_MAX) } : {}),
  } as (O['pinned'] extends true ? { pinned: z.ZodBoolean } : unknown) & (O['position'] extends true ? { position: z.ZodNumber } : unknown)
}

/** The output fields of the flags that are on: `Note = { … } & OrderOutput<typeof notesConfig.order>` */
export type OrderOutput<O extends OrderSpec> = (O['pinned'] extends true ? { pinned: boolean } : unknown) &
  (O['position'] extends true ? { position: number } : unknown)
