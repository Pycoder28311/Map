import type { PanelRef } from '../../../features/workspace/types'
import type { ButtonIcon } from '../icons/IconSlot'

/** One node: a folder (has children, opens/closes) or a leaf (a link to a page) */
export type TreeNode = {
  id: string
  label: string
  icon?: ButtonIcon
  /** Leaf: the page it opens (defaults to the panel's page when `panel` is set) */
  to?: string
  /** Folder: its child nodes */
  children?: TreeNode[]
  /** Leaf: the workspace panel it represents */
  panel?: PanelRef
  /** Leaf: may be dragged onto the current page or a panel to combine them */
  draggable?: boolean
}
