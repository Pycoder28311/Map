import { useMemo, useRef, useState } from 'react'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import { useResourceLists } from '../../lib/resource/hooks'
import { RESOURCES, resourcesWith } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { useDragSurface } from '../drag/surfaces'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import { cardOf, COMMENT_SIZE } from './cards/cardStyles'
import ItemCard from './ItemCard'
import RowHeader from './RowHeader'
import { SectionCardLook } from './SectionCard'
import { sortByDate } from './sortByDate'
import { groupByRoot, rootResources, type Entry } from './tree'
import { useRowSort } from './useRowSort'

/** The resources whose items get a row each (the projects) */
const ROOTS = rootResources(RESOURCES)
/** What the rows hold: the other resources of the Dashboard, in the UI config's order */
const CHILDREN = resourcesWith('dashboard').filter((r) => !ROOTS.includes(r))

/** The Orphans row (what is in no project) comes after the project rows; false leaves it out */
const SHOW_ORPHANS = true
const ORPHANS = 'orphans'

type Item = Record<string, unknown> & { id: number | string; createdAt?: string }
type Creating = { resource: AnyResource; initial?: Record<string, unknown> }

/**
 * Under the columns: a row per project, with its items in it (its folders, articles, object cards, notes… and what is inside its
 * folders), then an Orphans row with what is in no project. A row is a strip of cards that scrolls sideways; its header sorts the
 * cards and adds an item to the row (a child of the project). A card opens in its modal (the item's editor), or as a page when its
 * resource has a panel of its own (a map's board). All the lists are the ones the sidebar and the columns already hold: one request
 * each, shared (useResourceLists).
 */
export default function DashboardSections() {
  const rootRef = useRef<HTMLDivElement>(null)
  const open = useOpenLayout()
  const { sortOf, setSort } = useRowSort()
  const [editing, setEditing] = useState<{ resource: AnyResource; id: string } | null>(null)
  const [creating, setCreating] = useState<Creating | null>(null)

  const roots = useResourceLists(ROOTS)
  const kids = useResourceLists(CHILDREN)

  const { byRoot, orphans } = useMemo(
    () =>
      groupByRoot(
        kids.lists.flatMap(({ resource, items }) => items.map((item) => ({ resource, item }) as Entry)),
        roots.lists.map(({ resource, items }) => ({ resource, items: items as Item[] })),
      ),
    [kids.lists, roots.lists],
  )

  // The rows: a project each, in the projects' order (pinned first), then the orphans
  const rows = [
    ...roots.lists.flatMap(({ resource, items }) =>
      (items as Item[]).map((item) => ({
        id: `${resource.name}:${item.id}`,
        title: resource.ui.row.title(item),
        entries: byRoot.get(`${resource.name}:${item.id}`) ?? [],
        root: { resource, item },
      })),
    ),
    ...(SHOW_ORPHANS ? [{ id: ORPHANS, title: 'Orphans', entries: orphans, root: null }] : []),
  ]
  useBlockFlip(rootRef, 'sections', rows.map((r) => r.id).join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  const openItem = (resource: AnyResource, id: string) => (resource.customPanel ? open(single({ type: resource.panelType, id })) : setEditing({ resource, id }))

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-8">
      {rows.map((row) => {
        // What can be added here: in a project, what can have a project as its parent; in the Orphans, anything
        const kinds = CHILDREN.filter((r) => !row.root || r.parents?.some((p) => p.resource === row.root.resource.name)).map((r) => ({
          value: r.name,
          label: r.ui.label,
          icon: r.ui.icon,
        }))
        const create = (name: string) => {
          const resource = CHILDREN.find((r) => r.name === name)
          if (!resource) return
          const parent = row.root && resource.parents?.find((p) => p.resource === row.root.resource.name)
          setCreating({ resource, initial: parent && row.root ? { objectType: parent.type, objectId: row.root.item.id } : undefined })
        }
        const sort = sortOf(row.id)
        const cards = sortByDate(
          row.entries.map((e) => e.item as Item),
          sort,
        )
        // sortByDate gives items back; the entry of each (its resource) is found again by identity
        const entryOf = new Map(row.entries.map((e) => [e.item, e]))
        return (
          <section key={row.id} data-dash-block={row.id} aria-label={row.title} className="relative flex flex-col gap-3 transition-opacity">
            <RowHeader
              name={row.title}
              onOpen={row.root ? () => openItem(row.root.resource, String(row.root.item.id)) : undefined}
              sort={sort}
              onSort={(next) => setSort(row.id, next)}
              create={{ kinds, onCreate: create }}
            />
            <div data-row-strip={row.id} className="-mx-2 flex min-h-56 snap-x gap-3 overflow-x-auto px-2 pt-1 pb-3">
              {!kids.ready ? (
                <Placeholder>Loading…</Placeholder>
              ) : cards.length === 0 ? (
                <Placeholder>{row.root ? 'Nothing in this project yet' : 'Nothing here'}</Placeholder>
              ) : (
                cards.map((item) => {
                  const entry = entryOf.get(item)!
                  return (
                    <div key={`${entry.resource.name}:${item.id}`} data-flip-card={`${entry.resource.name}:${item.id}`} className="shrink-0">
                      <ItemCard resource={entry.resource} item={item} onOpen={() => openItem(entry.resource, String(item.id))} />
                    </div>
                  )
                })
              )}
            </div>
          </section>
        )
      })}
      {kids.hasMore && (
        <button type="button" onClick={kids.loadMore} className="cursor-pointer self-start text-small text-fg-muted hover:text-fg">
          Load more items
        </button>
      )}
      {editing && <ResourceModal resource={editing.resource} itemId={editing.id} onClose={() => setEditing(null)} />}
      {creating && <ResourceCreateDialog resource={creating.resource} initial={creating.initial} onClose={() => setCreating(null)} />}
    </div>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${cardOf(COMMENT_SIZE)} items-center justify-center border border-dashed border-line-strong text-body text-fg-subtle shadow-none ring-0`}>{children}</p>
  )
}
