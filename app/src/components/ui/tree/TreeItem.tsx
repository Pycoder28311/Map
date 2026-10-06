import type { CSSProperties, ReactNode } from 'react'
import { LuChevronDown, LuChevronRight } from 'react-icons/lu'
import Button from '../Button'
import NavButton from '../NavButton'
import type { TreeNode } from './types'

/** Renders a leaf; gets the classes and indent the tree computed for it */
export type RenderLeaf = (node: TreeNode, props: { className: string; style: CSSProperties }) => ReactNode

type Props = {
  node: TreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  renderLeaf?: RenderLeaf
}

const LEAF_CLASS = 'w-full justify-start'

/** One node: a folder (Button, opens/closes) or a page (NavButton or renderLeaf); renders open folders' children recursively */
export default function TreeItem({ node, depth, expanded, onToggle, renderLeaf }: Props) {
  const isFolder = !!node.children?.length
  const isOpen = expanded.has(node.id)
  // Theme padding + one indent step per level
  const indent: CSSProperties = { paddingInlineStart: `calc(var(--btn-px) + ${depth} * var(--tree-indent))` }

  return (
    <li role="treeitem" aria-expanded={isFolder ? isOpen : undefined}>
      {isFolder ? (
        <Button
          variant="ghost"
          icon={isOpen ? LuChevronDown : LuChevronRight}
          onClick={() => onToggle(node.id)}
          className={LEAF_CLASS}
          style={indent}
        >
          {node.label}
        </Button>
      ) : renderLeaf ? (
        renderLeaf(node, { className: LEAF_CLASS, style: indent })
      ) : (
        <NavButton to={node.to ?? '/'} icon={node.icon} className={LEAF_CLASS} style={indent}>
          {node.label}
        </NavButton>
      )}

      {isFolder && isOpen && (
        <ul role="group" className="mt-1 flex flex-col gap-1">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              renderLeaf={renderLeaf}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
