import { useMemo, useState, type ComponentProps } from 'react'
import { LuChevronsDown, LuChevronsUp, LuPin, LuUnlink } from 'react-icons/lu'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { useResourceMenu } from '../../../lib/resource/actions'
import { useResourceList } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../../ui/buttons/Button'
import { TREE_ROW_LOOK } from '../../ui/buttons/buttonStyles'
import { useLids } from '../../ui/tree/swallow'
import TreeView from '../../ui/tree/TreeView'
import type { TreeNode, TreeRightIcon } from '../../ui/tree/types'
import { sidebarFilter } from './sidebarLists'
import { useSidebarDrop } from './sidebarDropState'

type Item = Record<string, unknown> & { id: number | string }

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
 * A resource's rows in the sidebar: its sidebar list (sidebarFilter), the first few, then Show more / less. The rows open its panel,
 * drag onto pane edges and the Trash, rename in place, and have the ⋯ menu (pin, duplicate, trash, delete…). They take no drops:
 * their order comes from the server (pinned first).
 */
export default function ResourceRows({ resource, tree, compact, only, prefix = '', quiet = false }: Props) {
  const limit = resource.surfaces.sidebar?.limit ?? 5
  const list = useResourceList(resource, { filter: sidebarFilter(resource) })
  const { menuOf, actions, attempt, dialogs } = useResourceMenu(resource)
  const workspace = useWorkspace()
  const drop = useSidebarDrop()
  const lidOpen = useLids()
  const [showAll, setShowAll] = useState(false)
  const titleField = resource.ui.fields.find((f) => f.heading)?.name

  const items = only ? (list.items as Item[]).filter(only) : (list.items as Item[])
  const nodeId = (item: Item) => `${prefix}${resource.panelType}-${item.id}`
  const byNode = useMemo(() => new Map(items.map((item) => [nodeId(item), item])), [items]) // eslint-disable-line react-hooks/exhaustive-deps
  const nodes: TreeNode[] = items.map((item) => ({
    id: nodeId(item),
    label: resource.ui.row.title(item),
    icon: resource.ui.icon,
    panel: { type: resource.panelType, id: String(item.id) },
    draggable: true,
    locked: true,
    rowData: { 'data-share-id': `${resource.panelType}:${item.id}` },
  }))
  const hidden = nodes.length - limit
  const shown = showAll || hidden <= 0 ? nodes : nodes.slice(0, limit)

  const menuItem = (item: Item) => ({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })

  const rightIcons = (node: TreeNode): TreeRightIcon[] => {
    const item = byNode.get(node.id)
    const undrag: TreeRightIcon[] =
      node.panel && workspace.isPane(node.panel)
        ? [{ icon: LuUnlink, label: `Remove from screen: ${node.label}`, show: 'hover', onClick: () => workspace.close(node.panel!) }]
        : []
    if (!item) return undrag
    const pin: TreeRightIcon[] = !only && resource.ui.row.pinned?.(item) ? [{ icon: LuPin, label: 'Pinned', show: 'always' }] : []
    const more: TreeRightIcon = { label: `More: ${node.label}`, show: 'hover', menu: menuOf(menuItem(item), { onRename: () => tree.onEditingChange?.(node.id) }) }
    return [...undrag, ...pin, more]
  }

  const settings: SidebarTreeSettings = {
    ...tree,
    // What a dragged row carries: the item, so the Trash and the pane edges know what it is
    renderLink: (node, props) => (
      <PanelDragLink
        node={node}
        object={{ nodeId: node.id, objectId: String(byNode.get(node.id)?.id ?? ''), kind: resource.panelType, icon: node.icon, source: 'sidebar' }}
        {...props}
      />
    ),
    onRename: (node, name) => {
      const item = byNode.get(node.id)
      if (item && titleField) void attempt('rename it', () => actions.update(item.id, { [titleField]: name }))
    },
    canRename: (node) => byNode.has(node.id) && titleField !== undefined,
    icons: { right: rightIcons },
    dnd: { draggingId: drop.draggingNodeId, lidOpen },
  }

  const status =
    list.status === 'loading' ? (
      'Loading…'
    ) : list.status === 'error' ? (
      <button type="button" onClick={list.refresh} className="cursor-pointer underline-offset-2 hover:underline">
        Could not load. Try again
      </button>
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
        <Button
          variant="ghost"
          icon={showAll ? LuChevronsUp : LuChevronsDown}
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
          title={showAll ? 'Show less' : `Show ${hidden} more`}
          aria-label={showAll ? 'Show less' : `Show ${hidden} more`}
          className={`mt-1 w-full justify-start overflow-hidden text-fg-muted ${TREE_ROW_LOOK}`}
        >
          {!compact && <span className="whitespace-nowrap">{showAll ? 'Show less' : `Show more (${hidden})`}</span>}
        </Button>
      )}
      {showAll && !only && list.hasMore && (
        <Button variant="ghost" onClick={list.loadMore} disabled={list.loadingMore} className={`mt-1 w-full justify-start overflow-hidden text-fg-muted ${TREE_ROW_LOOK}`}>
          {!compact && <span className="whitespace-nowrap">{list.loadingMore ? 'Loading…' : 'Load more'}</span>}
        </Button>
      )}
      {dialogs}
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
