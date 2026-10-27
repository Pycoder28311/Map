import { useDroppable } from '@dnd-kit/core'
import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { useMemo, useRef, useState } from 'react'
import ResourceCreateDialog from '../../components/ui/resource/ResourceCreateDialog'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import { actionsOf, useResourceLists } from '../../lib/resource/hooks'
import type { AnyResource } from '../../resources/types'
import { useObjectDrop } from '../drag/objectDrop'
import { PLACE_ZONE, placeDropData, type PlaceParent, type PlaceTarget, type PlaceValue } from '../drag/placeDrop'
import { compareEntries, positionAtStart } from '../../lib/resource/reorder'
import { useDragSurface } from '../drag/surfaces'
import { RESOURCES } from '../../resources/registry'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import { CARD_SIZE, cardOf } from './cards/cardStyles'
import { FOLDER_TILES } from './cards/FolderFace'
import DraftCard from './DraftCard'
import { DRAFTED } from './draftKinds'
import FolderDraft from './FolderDraft'
import FolderModal from './FolderModal'
import ItemCard from './ItemCard'
import RowHeader from './RowHeader'
import { SectionCardLook } from './SectionCard'
import { sortByDate } from './sortByDate'
import { CHILDREN, ROOTS } from './childResources'
import { groupByParent, groupByRoot, parentTypeOf, type Entry } from './tree'
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
/** A draft card in a row: not in the database until its Create button is pressed (`key` tells drafts apart) */
type Draft = { key: number; rowId: string; resource: AnyResource; initial: Record<string, unknown> }

/**
 * Under the columns: a row per project, with its items in it (its folders, articles, object cards, notes…; what is inside a folder shows in the folder's card), then an Orphans row with what is in no project. A row is a strip of cards that scrolls sideways; its header sorts the
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
  // A draft card floating beside a folder, from its + menu (one at a time)
  const [folderDraft, setFolderDraft] = useState<{ folderKey: string; resource: AnyResource; initial: Record<string, unknown>; landed?: boolean } | null>(null)
  // The folder opened (its cards in a modal)
  const [folder, setFolder] = useState<{ resource: AnyResource; id: string } | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const draftKey = useRef(0)

  const roots = useResourceLists(ROOTS, { limit: PAGE_SIZE_DEFAULT })
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT })

  // What is directly in each folder (its tiles): its first items, in the rows' order
  const contents = useMemo(() => {
    const byParent = groupByParent(kids.lists.flatMap(({ resource, items }) => items.map((item) => ({ resource, item }) as Entry)))
    return new Map([...byParent].map(([key, entries]) => [key, [...entries].sort(compareEntries)]))
  }, [kids.lists])
  // The cards a draft is settling onto: hidden until it has landed on them (`<resource>:<id>`)
  const [settling, setSettling] = useState<Set<string>>(new Set())

  const { byRoot, orphans } = useMemo(
    () =>
      groupByRoot(
        kids.lists.flatMap(({ resource, items }) => items.map((item) => ({ resource, item }) as Entry)),
        roots.lists.map(({ resource, items }) => ({ resource, items: items as Item[] })),
      ),
    [kids.lists, roots.lists],
  )

  // A row holds only what is directly in its project (or, in the Orphans row, in nothing): what is in a folder shows inside that folder
  // (its tiles), not beside it
  const kidKeys = useMemo(() => new Set(kids.lists.flatMap(({ resource, items }) => items.map((item) => `${resource.name}:${item.id}`))), [kids.lists])
  const inFolder = (entry: Entry) => {
    const parent = entry.resource.parents?.find((p) => p.type === entry.item.objectType)
    return parent !== undefined && kidKeys.has(`${parent.resource}:${entry.item.objectId}`)
  }

  // The rows: the orphans first, then a project each, in the projects' order (the sidebar's: pinned, position). In a row, the items of
  // every resource in one order (pinned, position, across tables)
  const projectRows = roots.lists.flatMap(({ resource, items }) =>
    (items as Item[]).map((item) => ({
      id: `${resource.name}:${item.id}`,
      title: resource.ui.row.title(item),
      entries: (byRoot.get(`${resource.name}:${item.id}`) ?? []).filter((entry) => !inFolder(entry)).sort(compareEntries),
      root: { resource, item },
    })),
  )
  const rows = [
    ...(SHOW_ORPHANS ? [{ id: ORPHANS, title: 'Orphans', entries: orphans.filter((e) => inOrphans(e.resource) && !inFolder(e)).sort(compareEntries), root: null }] : []),
    ...projectRows,
  ]
  useBlockFlip(rootRef, 'sections', rows.map((r) => r.id).join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  // A card that can be a parent (a folder): dropped on its middle, an item goes inside it, as its last child
  const intoOf = (entry: Entry) => {
    const type = parentTypeOf(entry.resource, RESOURCES)
    return type ? { parent: { type, resource: entry.resource.name, id: entry.item.id }, list: () => contents.get(`${entry.resource.name}:${entry.item.id}`) ?? [] } : undefined
  }

  const openItem = (resource: AnyResource, id: string) => {
    if (resource.customPanel) open(single({ type: resource.panelType, id }))
    // A folder shows what is in it, as cards
    else if (resource.ui.card === 'folder') setFolder({ resource, id })
    else setEditing({ resource, id })
  }
  const openedFolder = folder && kids.lists.find((l) => l.resource === folder.resource)?.items.find((i) => String(i.id) === folder.id)

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-xxl">
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
          const initial = {
            ...(parent && row.root ? { objectType: parent.type, objectId: row.root.item.id } : {}),
            // At the start of the row. Every list is loaded from its first item on (the server's order), so what is not loaded yet
            // comes after what is: a key before the row's first loaded item is before all of them
            position: positionAtStart(row.entries),
          }
          if (DRAFTED.includes(resource.name)) setDrafts((all) => [{ key: draftKey.current++, rowId: row.id, resource, initial }, ...all])
          else setCreating({ resource, initial })
        }
        const rowDrafts = drafts.filter((d) => d.rowId === row.id)
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
            <div data-row-strip={row.id} className="-mx-2 flex min-h-[14rem] snap-x gap-lg overflow-x-auto px-2 pt-4 pb-4">
              {rowDrafts.map((d) => (
                <div key={d.key} className="shrink-0">
                  <DraftCard
                    resource={d.resource}
                    initial={d.initial}
                    onCreated={(id) => setSettling((all) => new Set(all).add(`${d.resource.name}:${id}`))}
                    onDone={() => {
                      setDrafts((all) => all.filter((x) => x !== d))
                      setSettling((all) => (all.size ? new Set() : all))
                    }}
                  />
                </div>
              ))}
              {!kids.ready ? (
                <Placeholder>Loading…</Placeholder>
              ) : cards.length === 0 ? (
                rowDrafts.length === 0 && <Placeholder>{row.root ? 'Nothing in this project yet' : 'Nothing here'}</Placeholder>
              ) : (
                cards.map((item) => {
                  const entry = entryOf.get(item)!
                  return (
                    <div
                      key={`${entry.resource.name}:${item.id}`}
                      data-flip-card={`${entry.resource.name}:${item.id}`}
                      data-glide={`${entry.resource.panelType}:${item.id}`}
                      data-glide-in="dashboard"
                      className={`shrink-0 ${settling.has(`${entry.resource.name}:${item.id}`) ? 'invisible' : ''}`}
                    >
                      <ItemCard
                        resource={entry.resource}
                        item={item}
                        contents={contents
                          .get(`${entry.resource.name}:${item.id}`)
                          // (what a draft is making is the dashed tile's, until the card has flown into it)
                          ?.filter((e) => !settling.has(`${e.resource.name}:${e.item.id}`))
                          .slice(0, FOLDER_TILES)}
                        pending={folderDraft?.folderKey === `${entry.resource.name}:${item.id}` && !folderDraft.landed}
                        onDraftIn={(kind) => {
                          const type = parentTypeOf(entry.resource, RESOURCES)
                          const key = `${entry.resource.name}:${item.id}`
                          if (type) setFolderDraft({ folderKey: key, resource: kind, initial: { objectType: type, objectId: item.id, position: positionAtStart(contents.get(key) ?? []) } })
                        }}
                        onOpen={() => openItem(entry.resource, String(item.id))}
                        place={sort ? undefined : { kind: 'card', rowId: row.id, entry, list, parent, into: intoOf(entry) }}
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
      {folderDraft && (
        <FolderDraft
          key={folderDraft.folderKey + folderDraft.resource.name}
          folderKey={folderDraft.folderKey}
          resource={folderDraft.resource}
          initial={folderDraft.initial}
          onCreated={(id) => setSettling((all) => new Set(all).add(`${folderDraft.resource.name}:${id}`))}
          onLanded={() => {
            setFolderDraft((d) => d && { ...d, landed: true })
            setSettling((all) => (all.size ? new Set() : all))
          }}
          onDone={() => {
            setFolderDraft(null)
            setSettling((all) => (all.size ? new Set() : all))
          }}
        />
      )}
      {folder && openedFolder && (
        <FolderModal
          resource={folder.resource}
          item={openedFolder as Item}
          entries={contents.get(`${folder.resource.name}:${folder.id}`) ?? []}
          contentsOf={(entry) => contents.get(`${entry.resource.name}:${entry.item.id}`)?.slice(0, FOLDER_TILES)}
          onOpen={(entry) => openItem(entry.resource, String(entry.item.id))}
          onClose={() => setFolder(null)}
        />
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
      className={`relative flex flex-col gap-lg rounded-(--btn-radius) outline-2 outline-offset-4 transition-[opacity,outline-color] ${over ? 'bg-drop/10 outline-drop/55' : 'outline-transparent'}`}
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
