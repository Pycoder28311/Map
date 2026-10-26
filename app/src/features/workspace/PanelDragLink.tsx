import type { CSSProperties, ReactNode } from 'react'
import { resourceByPanelType } from '../../resources/registry'
import { useItemModal } from '../items/ItemModal'
import TreeRowLink from '../../components/ui/tree/TreeRowLink'
import type { TreeNode } from '../../components/ui/tree/types'
import { useObjectDrag } from '../drag/objectDrag'
import type { ObjectDragInfo } from './types'
import { useWorkspace } from './useWorkspace'

type Props = {
  node: TreeNode
  /** It's an object (e.g. a sidebar row's): it can also be dropped on rows, link nodes, the trash */
  object?: ObjectDragInfo
  className?: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * A tree row's link (click = go there) that can also be dragged onto the current page or a panel
 * when it represents a draggable panel, and (with `object`) onto object drop targets. `draggable:
 * false` never drags. Without `object`: disabled while that panel is open or 4 are open (the drop
 * zones also refuse those, so with `object` it stays draggable for the other targets).
 * Its content (left icons + label) comes from the tree as children.
 */
export default function PanelDragLink({ node, object, className = '', style, children }: Props) {
  const { isOpen, isDraggable, canAdd, hrefOf } = useWorkspace()
  const itemModal = useItemModal()
  const panel = node.panel
  // An item of a resource that opens in a modal (surfaces.modal): a plain click shows the modal; with Ctrl/Shift/Alt/middle it is still a link
  const modalOf = panel?.id ? resourceByPanelType(panel.type) : undefined
  const inModal = modalOf?.surfaces.modal ? modalOf : undefined
  const open = panel ? isOpen(panel) : false
  const disabled = !panel || !node.draggable || (!object && (!isDraggable(panel) || open || !canAdd))

  const { setNodeRef, listeners, attributes } = useObjectDrag({
    id: `tree:${node.id}`,
    label: node.label,
    panel,
    object: object ?? { nodeId: node.id, icon: node.icon, source: 'sidebar' },
    disabled,
  })
  // Keep the link's own role (dnd-kit would announce it as a button)
  const { role: _role, ...dragAttributes } = attributes

  return (
    <TreeRowLink
      ref={setNodeRef}
      {...(disabled ? {} : { ...listeners, ...dragAttributes })}
      to={node.to ?? (panel ? hrefOf(panel) : '/')}
      onClick={
        inModal && panel?.id
          ? (e) => {
              if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              itemModal.open(inModal, panel.id!)
            }
          : undefined
      }
      active={panel ? open : undefined}
      className={className}
      style={style}
    >
      {children}
    </TreeRowLink>
  )
}
