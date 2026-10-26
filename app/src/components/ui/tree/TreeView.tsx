import { useEffect, useState, type CSSProperties } from 'react'
import { withoutEmptyFolders } from './openFolders'
import TreeItem, { type RenderLink } from './TreeItem'
import type { TreeDnd, TreeIcons, TreeNode } from './types'

type Props = {
  nodes: TreeNode[]
  label: string
  /** Custom link for leaves and folders with a page (e.g. a draggable link); default: TreeRowLink */
  renderLink?: RenderLink
  /** Left and right icons of every row, with when they show and their background (types.ts) */
  icons?: TreeIcons
  /** Names can be edited in place: double-click one (the text cursor shows over it), or set
   *  `editingId` from outside (e.g. a menu's Rename). Gets the new name, trimmed, only when it changed */
  onRename?: (node: TreeNode, name: string) => void
  /** Which names can be renamed (default: all, when onRename is set) */
  canRename?: (node: TreeNode) => boolean
  /** The row whose name is being edited (controlled; leave both out to let the tree keep it) */
  editingId?: string | null
  onEditingChange?: (id: string | null) => void
  /** Rows that stay visible under their collapsed folder (e.g. the ones open on screen) */
  keepVisible?: (node: TreeNode) => boolean
  /** Drag & drop within the tree: what takes drops, what drags, and where the current drag would land */
  dnd?: TreeDnd
  /** Icons only (e.g. a thin sidebar): rows shrink to their icon, no right icons. Nothing moves, so
   *  a container can clip the tree while it narrows and reveal it again while it widens */
  compact?: boolean
}

// Compact: a row is its icon's box + the row padding on both sides (outside compact: no limit), and
// children aren't indented (one column). Rows shrink/grow between the two over --tree-compact-duration
const COMPACT: CSSProperties = {
  '--tree-row-max': 'calc(2 * var(--btn-px) + var(--btn-icon-size) + 2 * var(--btn-close-p))',
  '--tree-indent-now': '0px',
  '--tree-line-color': 'transparent',
  '--tree-indent-duration': '0s',
} as CSSProperties

/** Expandable tree; knows nothing about what the nodes mean */
export default function TreeView({
  nodes,
  label,
  renderLink,
  icons,
  onRename,
  canRename,
  editingId,
  onEditingChange,
  keepVisible,
  dnd,
  compact,
}: Props) {
  // Ids of open folders. One Set for the whole tree, so items stay simple.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // A folder that lost its last child closes (so it starts closed when something is put in it again)
  useEffect(() => setExpanded((open) => withoutEmptyFolders(open, nodes)), [nodes])
  // The row being renamed, when the parent doesn't control it
  const [ownEditingId, setOwnEditingId] = useState<string | null>(null)
  const editing = onEditingChange ? (editingId ?? null) : ownEditingId
  const setEditing = onEditingChange ?? setOwnEditingId

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <ul role="tree" aria-label={label} style={compact ? COMPACT : undefined} className="flex flex-col gap-sm">
      {nodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={toggle}
          renderLink={renderLink}
          icons={icons}
          editingId={editing}
          onEditingChange={setEditing}
          onRename={onRename}
          canRename={canRename}
          keepVisible={keepVisible}
          dnd={dnd}
          compact={compact}
        />
      ))}
    </ul>
  )
}
