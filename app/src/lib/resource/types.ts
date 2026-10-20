import type { ResourceApi } from '../api/resource'

/** What the data hooks need of a resource: its name (the change bus's key) and its API calls */
export type ResourceCore<TItem, TListItem, TInput, TUpdate, TFilter extends object> = {
  /** e.g. 'notes' */
  name: string
  api: ResourceApi<TItem, TListItem, TInput, TUpdate, TFilter>
}
