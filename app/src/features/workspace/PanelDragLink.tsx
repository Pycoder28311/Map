import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties, ReactNode } from 'react'
import NavButton from '../../components/ui/buttons/NavButton'
import type { TreeNode } from '../../components/ui/tree/types'
import type { PanelDragData } from './types'
import { useWorkspace } from './useWorkspace'

type Props = { node: TreeNode; className?: string; style?: CSSProperties; children: ReactNode }

/**
 * A tree row's link (click = go there) that can also be dragged onto the current page or a panel
 * when it represents a draggable panel. Disabled while that panel is open or 4 are open.
 * Its content (left icons + label) comes from the tree as children.
 */
export default function PanelDragLink({ node, className = '', style, children }: Props) {
  const { isOpen, isDraggable, canAdd, hrefOf } = useWorkspace()
  const panel = node.panel
  const open = panel ? isOpen(panel) : false
  const disabled = !panel || !node.draggable || !isDraggable(panel) || open || !canAdd

  const data: PanelDragData | undefined = panel && { kind: 'new', panel, label: node.label }
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
