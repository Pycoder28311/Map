import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties, ReactNode } from 'react'
import NavButton from '../../components/ui/buttons/NavButton'
import type { TreeNode } from '../../components/ui/tree/types'
import type { PanelDragData, TreeDragInfo } from './types'
import { useWorkspace } from './useWorkspace'

type Props = {
  node: TreeNode
  /** It's a sidebar row: it can also be dragged within the sidebar */
  tree?: TreeDragInfo
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * A tree row's link (click = go there) that can also be dragged onto the current page or a panel
 * when it represents a draggable panel, and (with `tree`) within the sidebar. `draggable: false`
 * never drags. Without `tree`: disabled while that panel is open or 4 are open (the drop zones also
 * refuse those, so with `tree` it stays draggable for the sidebar).
 * Its content (left icons + label) comes from the tree as children.
 */
export default function PanelDragLink({ node, tree, className = '', style, children }: Props) {
  const { isOpen, isDraggable, canAdd, hrefOf } = useWorkspace()
  const panel = node.panel
  const open = panel ? isOpen(panel) : false
  const disabled = !panel || !node.draggable || (!tree && (!isDraggable(panel) || open || !canAdd))

  const data: PanelDragData | undefined = panel && { kind: 'new', panel, label: node.label, tree }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `tree:${node.id}`, data, disabled })
  // Keep the link's own role (dnd-kit would announce it as a button)
  const { role: _role, ...dragAttributes } = attributes

  return (
    <NavButton
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...dragAttributes })}
      to={node.to ?? (panel ? hrefOf(panel) : '/')}
      active={panel ? open : undefined}
      className={`${className} ${isDragging ? 'opacity-50' : ''}`}
      style={style}
    >
      {children}
    </NavButton>
  )
}
