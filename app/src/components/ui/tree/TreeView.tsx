import { useState } from 'react'
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
}

/** Expandable tree; knows nothing about what the nodes mean */
export default function TreeView({ nodes, label, renderLink, icons, editableLabels }: Props) {
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
    <ul role="tree" aria-label={label} className="flex flex-col gap-1">
      {nodes.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          expanded={expanded}
          onToggle={toggle}
          renderLink={renderLink}
          icons={icons}
          editableLabels={editableLabels}
        />
      ))}
    </ul>
  )
}
