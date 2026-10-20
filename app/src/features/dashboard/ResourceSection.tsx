import { useMemo, useState } from 'react'
import { useResourceMenu } from '../../lib/resource/actions'
import { useResourceList } from '../../lib/resource/hooks'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import type { AnyResource } from '../../resources/types'
import { cardOf, COMMENT_SIZE } from './cards/CardShell'
import ResourceCard from './ResourceCard'
import RowHeader from './RowHeader'
import { sortByDate } from './sortByDate'
import { useRowSort } from './useRowSort'

type Item = Record<string, unknown> & { id: number | string; createdAt?: string }

/**
 * A resource's row on the Dashboard (the Projects and Notes rows): its header (name, sort, "+"), then its cards in a strip that scrolls sideways.
 * The server's order (pinned first) unless a sort is chosen. The cards take no drops (nothing is moved between rows).
 */
export default function ResourceSection({ resource, row, onOpen }: { resource: AnyResource; row: 'projects' | 'notes'; onOpen: (id: string) => void }) {
  const list = useResourceList(resource)
  const { menuOf, dialogs } = useResourceMenu(resource)
  const { sortOf, setSort } = useRowSort()
  const [creating, setCreating] = useState(false)
  const items = useMemo(() => sortByDate(list.items as Item[], sortOf(row)), [list.items, sortOf, row])

  return (
    <section data-dash-block={row} aria-label={resource.ui.plural} className="relative flex flex-col gap-3 transition-opacity">
      <RowHeader
        name={resource.ui.plural}
        sort={sortOf(row)}
        onSort={(sort) => setSort(row, sort)}
        creatable={[]}
        onCreate={() => {}}
        createOne={{ label: resource.ui.label, onCreate: () => setCreating(true) }}
        named
      />
      <div data-row-strip={row} className="-mx-2 flex min-h-56 snap-x gap-3 overflow-x-auto px-2 pt-1 pb-3">
        {list.status === 'loading' ? (
          <Placeholder>Loading…</Placeholder>
        ) : list.status === 'error' ? (
          <Placeholder>
            <button type="button" onClick={list.refresh} className="cursor-pointer underline-offset-2 hover:underline">
              Could not load. Try again
            </button>
          </Placeholder>
        ) : items.length === 0 ? (
          <Placeholder>No {resource.ui.plural.toLowerCase()} yet</Placeholder>
        ) : (
          items.map((item) => (
            <div key={item.id} data-flip-card={String(item.id)} className="shrink-0">
              <ResourceCard
                resource={resource}
                item={item}
                onOpen={() => onOpen(String(item.id))}
                menu={menuOf({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })}
              />
            </div>
          ))
        )}
        {list.hasMore && (
          <button type="button" onClick={list.loadMore} disabled={list.loadingMore} className="shrink-0 cursor-pointer self-center px-2 text-small text-fg-muted hover:text-fg">
            {list.loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
      {dialogs}
      {creating && <ResourceCreateDialog resource={resource} onClose={() => setCreating(false)} />}
    </section>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${cardOf(COMMENT_SIZE)} items-center justify-center border border-dashed border-line-strong text-body text-fg-subtle shadow-none ring-0`}>{children}</p>
  )
}
