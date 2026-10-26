import { PAGE_SIZE_DEFAULT } from '@map/shared/page-size'
import { Fragment, useMemo, useState, type ComponentProps } from 'react'
import { LuChevronsDown, LuChevronsUp, LuPin, LuUnlink } from 'react-icons/lu'
import { CHILDREN, ROOTS } from '../../../features/dashboard/childResources'
import { groupByParent, parentTypeOf, type Entry } from '../../../features/dashboard/tree'
import { placeDropData, type PlaceParent, type PlaceTarget } from '../../../features/drag/placeDrop'
import { compareEntries } from '../../../lib/resource/reorder'
import { RESOURCES } from '../../../resources/registry'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { useResourceMenu } from '../../../lib/resource/actions'
import { useResourceList, useResourceLists } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../../ui/buttons/Button'
import IconSlot from '../../ui/icons/IconSlot'
import { SIDEBAR_ROW, TREE_ROW_LOOK } from '../../ui/rowStyles'
import { useLids } from '../../ui/tree/swallow'
import TreeView from '../../ui/tree/TreeView'
import type { TreeNode, TreeRightIcon } from '../../ui/tree/types'
import { useSidebarDrop } from './sidebarDropState'
import { useChildMenus } from './useChildMenus'

type Item = Record<string, unknown> & { id: number | string }

const NONE: AnyResource[] = []
/** The parent an item is in (what a drop on that same parent leaves as it is) */
const parentOf = (item: Item | undefined) =>
  item ? { type: (item.objectType as string | null | undefined) ?? null, id: (item.objectId as number | null | undefined) ?? null } : undefined
/** How many levels of folders are followed under a project (a cycle cannot be saved, but old data might have one) */
const MAX_DEPTH = 20
/** The projects' section also shows the orphans (items with no parent) among the projects; false leaves them to the Dashboard's Orphans row */
const ORPHANS_IN_SIDEBAR = true

export type SidebarTreeSettings = Omit<ComponentProps<typeof TreeView>, 'nodes' | 'label'>

type Props = {
  resource: AnyResource
  /** The tree settings shared by every section (compact rail, what's on screen stays visible…) */
  tree: SidebarTreeSettings
  compact: boolean
  /** Only these items (the Pinned section); default: the resource's sidebar list */
  only?: (item: Item) => boolean
  /** Node ids get this before them, so the same item in two sections has two rows (`pin:`) */
  prefix?: string
  /** Says nothing when there are none (a group of a section) */
  quiet?: boolean
}

/**
 * A resource's rows in the sidebar: its list, the first few, then Show more / less. A resource others point at (the projects) has its
 * children under each row (open with the arrow): their lists are the Dashboard's, so a child made anywhere shows in both at once.
 * The rows open its panel, drag onto pane edges and the Trash, rename in place, and have the ⋯ menu (pin, duplicate, trash, delete…).
 * They take drops (features/drag/placeDrop.ts): before or after a row moves an item there (among the section's own items at the top;
 * under a project, into that parent), and the middle of a project or folder row puts it inside as its last child. Pinned copies take none.
 */
export default function ResourceRows({ resource, tree, compact, only, prefix = '', quiet = false }: Props) {
  const limit = resource.surfaces.sidebar?.limit ?? 5
  const list = useResourceList(resource)
  const { menuOf, actions, attempt, dialogs } = useResourceMenu(resource)
  const workspace = useWorkspace()
  const drop = useSidebarDrop()
  const lidOpen = useLids()
  const [showAll, setShowAll] = useState(false)
  const withKids = !only && ROOTS.includes(resource)
  const kids = useResourceLists(CHILDREN, { limit: PAGE_SIZE_DEFAULT, enabled: withKids })
  const childMenus = useChildMenus(withKids ? CHILDREN : NONE)
  const kidsOf = useMemo(
    () => {
      if (!withKids) return new Map<string, Entry[]>()
      const byParent = groupByParent(kids.lists.flatMap(({ resource: r, items }) => items.map((item) => ({ resource: r, item }) as Entry)))
      // Under a parent, the items of every resource in one order (the server's rule across them)
      byParent.forEach((entries) => entries.sort(compareEntries))
      return byParent
    },
    [withKids, kids.lists],
  )
  /** The place of each row in its list, for drops (none in the Pinned section) */
  const placeOf = new Map<string, PlaceTarget>()
  /** A row that can be a parent: dropped in its middle, an item goes in as its last child */
  const intoOf = (r: AnyResource, item: Item) => {
    const type = parentTypeOf(r, RESOURCES)
    return type ? { parent: { type, resource: r.name, id: item.id }, list: () => kidsOf.get(`${r.name}:${item.id}`) ?? [] } : undefined
  }

  const items = only ? (list.items as Item[]).filter(only) : (list.items as Item[])
  const nodeId = (item: Item) => `${prefix}${resource.panelType}-${item.id}`
  const byNode = useMemo(() => new Map(items.map((item) => [nodeId(item), item])), [items]) // eslint-disable-line react-hooks/exhaustive-deps

  // The section's own rows; the projects' section also holds the orphans (items with no parent, of the resources with no section of
  // their own), among the projects by their position: where an item was let go out of its project is where it shows
  const topEntries = useMemo(() => {
    const own = items.map((item) => ({ resource, item }) as Entry)
    if (!withKids || !ORPHANS_IN_SIDEBAR) return own
    const orphans = kids.lists.flatMap(({ resource: r, items: rows }) =>
      r.parents?.length && !r.surfaces.sidebar ? rows.filter((row) => row.objectType == null).map((item) => ({ resource: r, item }) as Entry) : [],
    )
    return [...own, ...orphans].sort(compareEntries)
  }, [items, resource, withKids, kids.lists])
  // What can sit in the top list: its own resource and the orphans' resources (the others, e.g. notes, have a section of their own)
  const accepts = useMemo(() => (withKids && ORPHANS_IN_SIDEBAR ? [resource.name, ...CHILDREN.filter((r) => r.parents?.length && !r.surfaces.sidebar).map((r) => r.name)] : undefined), [withKids, resource])

  // The rows of the children (and of what is in their folders) and of the orphans, by node id: they are of other resources than this one
  const childByNode = new Map<string, Entry>()
  /** The row of an item of another resource: under a parent (`parentNodeId`) or, with none, at the top (an orphan) */
  const childNode = (entry: Entry, parentNodeId: string, entries: Entry[], parent: PlaceParent, depth: number): TreeNode => {
    const { resource: r, item } = entry
    const id = parentNodeId ? `${parentNodeId}/${r.panelType}-${item.id}` : `${r.panelType}-${item.id}`
    childByNode.set(id, entry)
    placeOf.set(id, { kind: 'node', nodeId: id, entry, list: () => entries, parent, accepts: parent === null ? accepts : undefined, into: intoOf(r, item) })
    const type = parentTypeOf(r, RESOURCES)
    return {
      id,
      label: r.ui.row.title(item),
      icon: r.ui.icon,
      panel: { type: r.panelType, id: String(item.id) },
      draggable: true,
      locked: true,
      rowData: { 'data-share-id': `${r.panelType}:${item.id}`, 'data-glide': `${r.panelType}:${item.id}`, 'data-glide-in': 'sidebar' },
      children: type ? childNodes(`${r.name}:${item.id}`, id, { type, resource: r.name, id: item.id }, depth + 1) : undefined,
    }
  }
  const childNodes = (parentKey: string, parentNodeId: string, parent: NonNullable<PlaceParent>, depth: number): TreeNode[] | undefined => {
    const entries = kidsOf.get(parentKey)
    if (!entries?.length || depth >= MAX_DEPTH) return undefined
    return entries.map((entry) => childNode(entry, parentNodeId, entries, parent, depth))
  }
  const ownType = parentTypeOf(resource, RESOURCES)
  const nodes: TreeNode[] = topEntries.map((entry) => {
    // An orphan, among the projects
    if (entry.resource !== resource) return childNode(entry, '', topEntries, null, 0)
    const item = entry.item
    // At the top of a section: among the section's own rows (the projects' section: and the orphans), each keeping its parent
    if (!only) {
      placeOf.set(nodeId(item), {
        kind: 'node',
        nodeId: nodeId(item),
        entry,
        list: () => topEntries,
        ...(withKids ? { accepts, parent: null } : { only: resource.name }),
        into: withKids ? intoOf(resource, item) : undefined,
      })
    }
    return {
      id: nodeId(item),
      label: resource.ui.row.title(item),
      icon: resource.ui.icon,
      panel: { type: resource.panelType, id: String(item.id) },
      draggable: true,
      locked: true,
      // data-glide: where a dropped object's faded copy slides to (features/drag/glide.ts); the Pinned copies are no place for it
      rowData: { 'data-share-id': `${resource.panelType}:${item.id}`, 'data-glide': `${resource.panelType}:${item.id}`, 'data-glide-in': only ? 'pinned' : 'sidebar' },
      children: withKids && ownType ? childNodes(`${resource.name}:${item.id}`, nodeId(item), { type: ownType, resource: resource.name, id: item.id }, 0) : undefined,
    }
  })
  const hidden = nodes.length - limit
  const shown = showAll || hidden <= 0 ? nodes : nodes.slice(0, limit)

  /** What a row is: its item, its resource and that resource's menu */
  const rowOf = (id: string) => {
    const own = byNode.get(id)
    if (own) return { resource, item: own, menu: { menuOf, actions, attempt } }
    const entry = childByNode.get(id)
    const menu = entry && childMenus.get(entry.resource.name)
    return entry && menu ? { resource: entry.resource, item: entry.item, menu } : undefined
  }
  const titleFieldOf = (r: AnyResource) => r.ui.fields.find((f) => f.heading)?.name

  const menuItem = (r: AnyResource, item: Item) => ({ id: item.id, title: r.ui.row.title(item), pinned: r.ui.row.pinned?.(item) })

  const rightIcons = (node: TreeNode): TreeRightIcon[] => {
    const row = rowOf(node.id)
    const undrag: TreeRightIcon[] =
      node.panel && workspace.isPane(node.panel)
        ? [{ icon: LuUnlink, label: `Remove from screen: ${node.label}`, show: 'hover', onClick: () => workspace.close(node.panel!) }]
        : []
    if (!row) return undrag
    const pin: TreeRightIcon[] = !only && row.resource.ui.row.pinned?.(row.item) ? [{ icon: LuPin, label: 'Pinned', show: 'always' }] : []
    const more: TreeRightIcon = {
      label: `More: ${node.label}`,
      show: 'hover',
      menu: row.menu.menuOf(menuItem(row.resource, row.item), { onRename: () => tree.onEditingChange?.(node.id) }),
    }
    return [...undrag, ...pin, more]
  }

  const settings: SidebarTreeSettings = {
    ...tree,
    // What a dragged row carries: the item, so the Trash and the pane edges know what it is
    renderLink: (node, props) => (
      <PanelDragLink
        node={node}
        object={{
          nodeId: node.id,
          objectId: String(rowOf(node.id)?.item.id ?? ''),
          kind: rowOf(node.id)?.resource.panelType ?? resource.panelType,
          icon: node.icon,
          source: 'sidebar',
          parent: parentOf(rowOf(node.id)?.item),
          pinned: rowOf(node.id)?.item.pinned === true,
        }}
        {...props}
      />
    ),
    onRename: (node, name) => {
      const row = rowOf(node.id)
      const titleField = row && titleFieldOf(row.resource)
      if (row && titleField) void row.menu.attempt('rename it', () => row.menu.actions.update(row.item.id, { [titleField]: name }))
    },
    canRename: (node) => {
      const row = rowOf(node.id)
      return row !== undefined && titleFieldOf(row.resource) !== undefined
    },
    icons: { right: rightIcons },
    dnd: {
      draggingId: drop.draggingNodeId,
      lidOpen,
      dropData: (node) => {
        const place = placeOf.get(node.id)
        return place ? placeDropData(place) : undefined
      },
      target: drop.place,
    },
  }

  const status =
    list.status === 'loading' ? (
      'Loading…'
    ) : list.status === 'error' ? (
      <Button variant="text" onClick={list.refresh}>
        Could not load. Try again
      </Button>
    ) : nodes.length === 0 ? (
      `No ${resource.ui.plural.toLowerCase()} yet`
    ) : null

  return (
    <>
      {status !== null ? (
        !quiet && <SectionNote compact={compact}>{status}</SectionNote>
      ) : (
        <TreeView nodes={shown} label={resource.ui.plural} {...settings} />
      )}
      {hidden > 0 && (
        // A sidebar row, like the rows above it (not a button)
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          title={showAll ? 'Show less' : `Show ${hidden} more`}
          aria-label={showAll ? 'Show less' : `Show ${hidden} more`}
          className={`${SIDEBAR_ROW} mt-1 w-full justify-start overflow-hidden text-fg-muted ${TREE_ROW_LOOK}`}
        >
          <IconSlot icon={showAll ? LuChevronsUp : LuChevronsDown} />
          {!compact && <span className="whitespace-nowrap">{showAll ? 'Show less' : `Show more (${hidden})`}</span>}
        </button>
      )}
      {showAll && !only && list.hasMore && (
        <button type="button" onClick={list.loadMore} disabled={list.loadingMore} className={`${SIDEBAR_ROW} mt-1 w-full justify-start overflow-hidden text-fg-muted ${TREE_ROW_LOOK}`}>
          {!compact && <span className="whitespace-nowrap">{list.loadingMore ? 'Loading…' : 'Load more'}</span>}
        </button>
      )}
      {dialogs}
      {[...childMenus.values()].map((menu, i) => (
        <Fragment key={i}>{menu.dialogs}</Fragment>
      ))}
    </>
  )
}

/** One line in the section's place (same height as a row, so the rail keeps its layout) */
export function SectionNote({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  return (
    <p className={`h-[calc(var(--pill-py)*2+1.25rem)] px-(--btn-px) text-small leading-[calc(var(--pill-py)*2+1.25rem)] text-fg-subtle ${compact ? 'opacity-0' : ''}`}>
      {children}
    </p>
  )
}
