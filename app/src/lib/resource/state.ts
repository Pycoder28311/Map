// The state behind useResourceList / useResourceItem, as pure reducers (state.test.ts). Answers that belong to an older request
// than the latest one are ignored, so a slow answer never overwrites a newer one.
import type { Page } from '@map/shared'
import { ApiError } from '../api/client'

/* ─────────────── A list (paged) ─────────────── */

export type ListState<T> = {
  /** loading: nothing to show yet; ready: showing items (maybe refreshing); error: the first load failed */
  status: 'loading' | 'ready' | 'error'
  items: T[]
  nextCursor: string | null
  /** The first answer has come */
  loaded: boolean
  /** Loading again while showing the old items */
  refreshing: boolean
  loadingMore: boolean
  error: Error | null
  /** The latest request's number */
  request: number
}

export type ListAction<T> =
  | { type: 'load'; request: number }
  | { type: 'more'; request: number }
  | { type: 'loaded'; request: number; page: Page<T>; append: boolean }
  | { type: 'failed'; request: number; error: Error }

export const initialList = <T>(): ListState<T> => ({
  status: 'loading',
  items: [],
  nextCursor: null,
  loaded: false,
  refreshing: false,
  loadingMore: false,
  error: null,
  request: 0,
})

export function listReducer<T>(state: ListState<T>, action: ListAction<T>): ListState<T> {
  switch (action.type) {
    case 'load':
      return { ...state, request: action.request, status: state.loaded ? 'ready' : 'loading', refreshing: state.loaded, loadingMore: false, error: null }
    case 'more':
      return { ...state, request: action.request, loadingMore: true }
    case 'loaded':
      if (action.request !== state.request) return state
      return {
        ...state,
        status: 'ready',
        items: action.append ? [...state.items, ...action.page.items] : action.page.items,
        nextCursor: action.page.nextCursor,
        loaded: true,
        refreshing: false,
        loadingMore: false,
        error: null,
      }
    case 'failed':
      if (action.request !== state.request) return state
      // A failed first load is an error; a failed refresh or "load more" keeps what is shown and says what went wrong
      return { ...state, status: state.loaded ? 'ready' : 'error', refreshing: false, loadingMore: false, error: action.error }
  }
}

/* ─────────────── One item ─────────────── */

export type ItemState<T> = {
  status: 'loading' | 'ready' | 'error' | 'notFound'
  item: T | null
  error: Error | null
  request: number
}

export type ItemAction<T> =
  | { type: 'load'; request: number }
  | { type: 'loaded'; request: number; item: T }
  | { type: 'failed'; request: number; error: Error }
  /** The server's version from a write (any time) */
  | { type: 'set'; item: T }
  | { type: 'gone' }

export const initialItem = <T>(): ItemState<T> => ({ status: 'loading', item: null, error: null, request: 0 })

export function itemReducer<T>(state: ItemState<T>, action: ItemAction<T>): ItemState<T> {
  switch (action.type) {
    case 'load':
      // Another item (or a reload): show it as loading, but keep the old one until the new one comes
      return { ...state, request: action.request, status: state.item ? state.status : 'loading', error: null }
    case 'loaded':
      return action.request === state.request ? { ...state, status: 'ready', item: action.item, error: null } : state
    case 'failed':
      if (action.request !== state.request) return state
      if (action.error instanceof ApiError && action.error.status === 404) return { ...state, status: 'notFound', item: null, error: action.error }
      return { ...state, status: state.item ? 'ready' : 'error', error: action.error }
    case 'set':
      return { ...state, status: 'ready', item: action.item, error: null }
    case 'gone':
      return { ...state, status: 'notFound', item: null }
  }
}
