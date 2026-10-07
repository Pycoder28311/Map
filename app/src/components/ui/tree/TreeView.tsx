import { useState, type CSSProperties } from 'react'
import TreeItem, { type RenderLink } from './TreeItem'
import type { TreeIcons, TreeNode } from './types'

type Props = {
  nodes: TreeNode[]
  label: string
  /** Custom link for leaves and folders with a page (e.g. a draggable link); default: NavButton */
  renderLink?: RenderLink
  /** Left and right icons of every row, with when they show and their background (types.ts) */
  icons?: TreeIcons
  /** Names can be edited: the text cursor shows over them */
  editableLabels?: boolean
  /** Icons only (e.g. a thin sidebar): rows shrink to their icon, no right icons. Nothing moves, so
   *  a container can clip the tree while it narrows and reveal it again while it widens */
  compact?: boolean
}

// Compact: a row is its icon's box + the row padding on both sides (outside compact: no limit).
// Rows shrink/grow between the two over --tree-compact-duration
const COMPACT: CSSProperties = {
  '--tree-row-max': 'calc(2 * var(--btn-px) + var(--btn-icon-size) + 2 * var(--btn-close-p))',
} as CSSProperties

/** Expandable tree; knows nothing about what the nodes mean */
export default function TreeView({ nodes, label, renderLink, icons, editableLabels, compact }: Props) {
  // Ids of open folders. One Set for the whole tree, so items stay simple.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <ul role="tree" aria-label={label} style={compact ? COMPACT : undefined} className="flex flex-col gap-1">
      {nodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={toggle}
          renderLink={renderLink}
          icons={icons}
          editableLabels={editableLabels}
          compact={compact}
        />
      ))}
    </ul>
  )
}
