import type { ReactNode } from 'react'
import Button from '../buttons/Button'
import type { ListResult } from '../../../lib/resource/hooks'

type Props<T> = {
  list: Pick<ListResult<T>, 'items' | 'status' | 'error' | 'hasMore' | 'loadingMore' | 'loadMore' | 'refresh'>
  renderItem: (item: T) => ReactNode
  keyOf: (item: T) => string | number
  /** Shown when there is nothing */
  empty: ReactNode
  /** Only the first rows are shown (e.g. the sidebar's five); "load more" is then not offered */
  limit?: number
  className?: string
}

/** The loading, empty, error and "load more" states around a resource's list: pass `useResourceList`'s result and how to draw one item */
export default function ResourceList<T>({ list, renderItem, keyOf, empty, limit, className = '' }: Props<T>) {
  if (list.status === 'loading') return <p className="px-2 py-2 text-body text-fg-subtle">Loading…</p>
  if (list.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2 px-2 py-2">
        <p role="alert" className="text-body text-danger">
          {list.error?.message ?? 'Could not load.'}
        </p>
        <Button variant="secondary" onClick={list.refresh}>
          Try again
        </Button>
      </div>
    )
  }
  if (list.items.length === 0) return <>{empty}</>
  const items = limit ? list.items.slice(0, limit) : list.items
  return (
    <>
      <ul className={className}>
        {items.map((item) => (
          <li key={keyOf(item)}>{renderItem(item)}</li>
        ))}
      </ul>
      {!limit && list.hasMore && (
        <Button variant="ghost" className="mt-1" onClick={list.loadMore} disabled={list.loadingMore}>
          {list.loadingMore ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </>
  )
}
