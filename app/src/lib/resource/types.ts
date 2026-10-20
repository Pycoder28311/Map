import type { ResourceApi } from '../api/resource'

/** What the data hooks need of a resource: its name (the change bus's key) and its API calls */
export type ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter extends object> = {
  /** e.g. 'notes' */
  name: string
  api: ResourceApi<TItem, TListItem, TInput, TUpdate, TFilter>
  /**
   * What the lists need to take a written item in without reading again: the order the server lists in (the flags of its
   * table config) and the list's version of a whole item. Without it a write makes the lists of the resource load again.
   * Method syntax on purpose, like ResourceApi.
   */
  list?: {
    order: ListOrder
    toItem(item: TItem): TListItem
  }
  /** What else happens when an item is copied or deleted for good (a map's board) */
  effects?: { copied?(fromId: string, toId: string): void; deleted?(id: string): void }
}

/** The order flags of a table's list (shared/order.ts): pinned first, then position, then id */
export type ListOrder = { pinned?: boolean; position?: boolean }
