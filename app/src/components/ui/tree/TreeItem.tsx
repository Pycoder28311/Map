import type { CSSProperties, ReactNode } from 'react'
import { LuChevronDown, LuChevronRight } from 'react-icons/lu'
import Button from '../buttons/Button'
import { ICON_HOVER } from '../buttons/buttonStyles'
import NavButton from '../buttons/NavButton'
import type { TreeNode } from './types'

/** Renders a leaf; gets the classes and indent the tree computed for it */
export type RenderLeaf = (node: TreeNode, props: { className: string; style: CSSProperties }) => ReactNode

/** Icon buttons on the right of a row, shown while it's hovered or focused (e.g. TreeActionButton) */
export type RenderActions = (node: TreeNode) => ReactNode

type Props = {
  node: TreeNode
  expanded: Set<string>
  onToggle: (id: string) => void
  renderLeaf?: RenderLeaf
  renderActions?: RenderActions
}

// Fills the row next to the actions; labels are cut with … instead of wrapping (see TreeLabel)
const LEAF_CLASS = 'min-w-0 flex-1 justify-start'

/** One node: a folder (Button, opens/closes) or a page (NavButton or renderLeaf); renders open folders' children recursively */
export default function TreeItem({ node, expanded, onToggle, renderLeaf, renderActions }: Props) {
  const isFolder = !!node.children?.length
  const isOpen = expanded.has(node.id)
  const Arrow = isOpen ? LuChevronDown : LuChevronRight
  // Same start padding for every row; deeper levels are indented by their group's margin (below)
  const indent: CSSProperties = { paddingInlineStart: 'var(--btn-px)' }
  const actions = renderActions?.(node)

  return (
    <li role="treeitem" aria-expanded={isFolder ? isOpen : undefined}>
      {/* The row: its hover background spans the button and the actions */}
      <div className="group/row flex items-center rounded-(--btn-radius) hover:bg-fill">
        {isFolder ? (
          <Button variant="ghost" onClick={() => onToggle(node.id)} className={LEAF_CLASS} style={indent}>
            {/* Own hover background; -my: its padding doesn't make the row taller */}
            <span className={`${ICON_HOVER} -my-(--btn-close-p)`}>
              <Arrow className="size-(--btn-icon-size)" />
            </span>
            <TreeLabel>{node.label}</TreeLabel>
          </Button>
        ) : renderLeaf ? (
          renderLeaf(node, { className: LEAF_CLASS, style: indent })
        ) : (
          <NavButton to={node.to ?? '/'} icon={node.icon} className={LEAF_CLASS} style={indent}>
            <TreeLabel>{node.label}</TreeLabel>
          </NavButton>
        )}

        {/* Hidden until the row is hovered or something in it has keyboard focus; same end padding as the start */}
        {actions && (
          <div className="hidden shrink-0 items-center gap-0.5 pe-(--btn-px) group-hover/row:flex group-focus-within/row:flex">
            {actions}
          </div>
        )}
      </div>

      {isFolder && isOpen && (
        // Children: narrower rows, moved right by one indent step
        <ul role="group" className="mt-1 ms-(--tree-indent) flex flex-col gap-1">
          {node.children!.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              renderLeaf={renderLeaf}
              renderActions={renderActions}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

/** A row's text: one line, cut with … when the row is too narrow */
export function TreeLabel({ children }: { children: ReactNode }) {
  return <span className="truncate">{children}</span>
}
