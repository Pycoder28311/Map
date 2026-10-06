import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import NavButton from '../../components/ui/buttons/NavButton'
import { TreeLabel } from '../../components/ui/tree/TreeItem'
import type { TreeNode } from '../../components/ui/tree/types'
import type { PanelDragData } from './WorkspaceProvider'
import { useWorkspace } from './useWorkspace'

type Props = { node: TreeNode; className?: string; style?: CSSProperties }

/**
 * A tree leaf: a link (click = go there) that can also be dragged onto the current page or a panel
 * when it represents a draggable panel. Disabled while that panel is open or 4 are open.
 */
export default function PanelDragLink({ node, className = '', style }: Props) {
  const { isOpen, isDraggable, canAdd, hrefOf } = useWorkspace()
  const panel = node.panel
  const open = panel ? isOpen(panel) : false
  const disabled = !panel || !node.draggable || !isDraggable(panel) || open || !canAdd

  const data: PanelDragData | undefined = panel && { panel, label: node.label }
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: `tree:${node.id}`, data, disabled })
  // Keep the link's own role (dnd-kit would announce it as a button)
  const { role: _role, ...dragAttributes } = attributes

  return (
    <NavButton
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...dragAttributes })}
      to={node.to ?? (panel ? hrefOf(panel) : '/')}
      icon={node.icon}
      active={panel ? open : undefined}
      className={`${className} ${isDragging ? 'opacity-50' : ''}`}
      style={style}
    >
      <TreeLabel>{node.label}</TreeLabel>
    </NavButton>
  )
}
