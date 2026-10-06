import { useState } from 'react'
import TreeItem, { type RenderLeaf } from './TreeItem'
import type { TreeNode } from './types'

type Props = {
  nodes: TreeNode[]
  label: string
  /** Custom leaf (e.g. a draggable link); default: NavButton */
  renderLeaf?: RenderLeaf
}

/** Expandable tree; knows nothing about what the nodes mean */
export default function TreeView({ nodes, label, renderLeaf }: Props) {
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
        <TreeItem key={node.id} node={node} depth={0} expanded={expanded} onToggle={toggle} renderLeaf={renderLeaf} />
      ))}
    </ul>
  )
}
