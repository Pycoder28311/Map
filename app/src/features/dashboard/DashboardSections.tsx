import { useDroppable } from '@dnd-kit/core'
import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { useMemo, useRef, useState } from 'react'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import { actionsOf, useResourceLists } from '../../lib/resource/hooks'
import type { AnyResource } from '../../resources/types'
import { useObjectDrop } from '../drag/objectDrop'
import { PLACE_ZONE, placeDropData, type PlaceParent, type PlaceTarget, type PlaceValue } from '../drag/placeDrop'
import { compareEntries, positionAtEnd } from '../../lib/resource/reorder'
import { useDragSurface } from '../drag/surfaces'
import { RESOURCES } from '../../resources/registry'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import { CARD_SIZE, cardOf } from './cards/cardStyles'
import ItemCard from './ItemCard'
import RowHeader from './RowHeader'
import { SectionCardLook } from './SectionCard'
import { sortByDate } from './sortByDate'
import { CHILDREN, ROOTS } from './childResources'
import { groupByRoot, parentTypeOf, type Entry } from './tree'
import { useRowSort } from './useRowSort'
import Button from '../../components/ui/buttons/Button'

/** The Orphans row (what is in no project) comes before the project rows; false leaves it out */
const SHOW_ORPHANS = true
const ORPHANS = 'orphans'
/** Notes (like any resource with a sidebar section of its own) are not shown in the Orphans row, nor offered by its Add button */
const inOrphans = (r: AnyResource) => !r.surfaces.sidebar

type Item = Record<string, unknown> & { id: number | string; createdAt?: string }
const titleFieldOf = (resource: AnyResource) => resource.ui.fields.find((f) => f.heading)?.name
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

  const roots = useResourceLists(ROOTS, { limit: PAGE_SIZE_DEFAULT })
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT })

  const { byRoot, orphans } = useMemo(
    () =>
      groupByRoot(
        kids.lists.flatMap(({ resource, items }) => items.map((item) => ({ resource, item }) as Entry)),
        roots.lists.map(({ resource, items }) => ({ resource, items: items as Item[] })),
      ),
    [kids.lists, roots.lists],
  )

  // The rows: the orphans first, then a project each, in the projects' order (the sidebar's: pinned, position). In a row, the items of
  // every resource in one order (pinned, position, across tables)
  const projectRows = roots.lists.flatMap(({ resource, items }) =>
    (items as Item[]).map((item) => ({
      id: `${resource.name}:${item.id}`,
      title: resource.ui.row.title(item),
      entries: [...(byRoot.get(`${resource.name}:${item.id}`) ?? [])].sort(compareEntries),
      root: { resource, item },
    })),
  )
  const rows = [...(SHOW_ORPHANS ? [{ id: ORPHANS, title: 'Orphans', entries: orphans.filter((e) => inOrphans(e.resource)).sort(compareEntries), root: null }] : []), ...projectRows]
  useBlockFlip(rootRef, 'sections', rows.map((r) => r.id).join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  const openItem = (resource: AnyResource, id: string) => (resource.customPanel ? open(single({ type: resource.panelType, id })) : setEditing({ resource, id }))

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-8">
      {rows.map((row) => {
        // What can be added here: in a project, what can have a project as its parent; in the Orphans, anything but notes
        const kinds = CHILDREN.filter((r) => (row.root ? r.parents?.some((p) => p.resource === row.root.resource.name) : inOrphans(r))).map((r) => ({
          value: r.name,
          label: r.ui.label,
          icon: r.ui.icon,
        }))
        const create = (name: string) => {
          const resource = CHILDREN.find((r) => r.name === name)
          if (!resource) return
          const parent = row.root && resource.parents?.find((p) => p.resource === row.root.resource.name)
          setCreating({
            resource,
            initial: {
              ...(parent && row.root ? { objectType: parent.type, objectId: row.root.item.id } : {}),
              // At the end of the row, when the row holds all of its items (else the server puts it last among its own kind)
              ...(!kids.hasMore ? { position: positionAtEnd(row.entries) } : {}),
            },
          })
        }
        const sort = sortOf(row.id)
        const parent: PlaceParent = row.root ? { type: parentTypeOf(row.root.resource, RESOURCES) ?? '', resource: row.root.resource.name, id: row.root.item.id } : null
        const list = () => row.entries
        // A card takes drops before or after it, in the manual order only (a date sort shows another order than the positions)
        const cards = sortByDate(
          row.entries.map((e) => e.item as Item),
          sort,
        )
        // sortByDate gives items back; the entry of each (its resource) is found again by identity
        const entryOf = new Map(row.entries.map((e) => [e.item, e]))
        return (
          <RowSection
            key={row.id}
            id={row.id}
            title={row.title}
            place={{ kind: 'row', rowId: row.id, list, parent }}
          >
            <RowHeader
              name={row.title}
              reflowId={`header:${row.id}`}
              onRename={row.root && titleFieldOf(row.root.resource) ? (name) => void actionsOf(row.root.resource).update(row.root.item.id, { [titleFieldOf(row.root.resource)!]: name }).catch(() => {}) : undefined}
              onOpen={row.root ? () => openItem(row.root.resource, String(row.root.item.id)) : undefined}
              sort={sort}
              onSort={(next) => setSort(row.id, next)}
              sortByLabel={!row.root}
              create={{ kinds, onCreate: create }}
            />
            <div data-row-strip={row.id} className="-mx-2 flex min-h-[13.25rem] snap-x gap-3 overflow-x-auto px-2 pt-1 pb-4">
              {!kids.ready ? (
                <Placeholder>Loading…</Placeholder>
              ) : cards.length === 0 ? (
                <Placeholder>{row.root ? 'Nothing in this project yet' : 'Nothing here'}</Placeholder>
              ) : (
                cards.map((item) => {
                  const entry = entryOf.get(item)!
                  return (
                    <div
                      key={`${entry.resource.name}:${item.id}`}
                      data-flip-card={`${entry.resource.name}:${item.id}`}
                      data-glide={`${entry.resource.panelType}:${item.id}`}
                      data-glide-in="dashboard"
                      className="shrink-0"
                    >
                      <ItemCard
                        resource={entry.resource}
                        item={item}
                        onOpen={() => openItem(entry.resource, String(item.id))}
                        place={sort ? undefined : { kind: 'card', rowId: row.id, entry, list, parent }}
                      />
                    </div>
                  )
                })
              )}
            </div>
          </RowSection>
        )
      })}
      {kids.hasMore && (
        <Button variant="text" onClick={kids.loadMore} className="self-start">
          Load more items
        </Button>
      )}
      {editing && <ResourceModal resource={editing.resource} itemId={editing.id} onClose={() => setEditing(null)} />}
      {creating && <ResourceCreateDialog resource={creating.resource} initial={creating.initial} onClose={() => setCreating(null)} />}
    </div>
  )
}

/** A row: an object dropped on it (not on a card) goes at its end, into its project (the Orphans row: out of its project) */
function RowSection({ id, title, place, children }: { id: string; title: string; place: PlaceTarget; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `dash-row:${id}`, data: placeDropData(place) })
  const { target } = useObjectDrop()
  const over = target?.zone === PLACE_ZONE && (target.value as unknown as PlaceValue).mark === `row:${id}`
  return (
    <section
      ref={setNodeRef}
      data-dash-block={id}
      aria-label={title}
      className={`relative flex flex-col gap-3 rounded-(--btn-radius) outline-2 outline-offset-4 transition-[opacity,outline-color] ${over ? 'bg-drop/10 outline-drop/55' : 'outline-transparent'}`}
    >
      {children}
    </section>
  )
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${cardOf(CARD_SIZE)} items-center justify-center border border-dashed border-line-strong text-body text-fg-subtle shadow-none ring-0`}>{children}</p>
  )
}
