import type { PanelRef } from '../../../features/workspace/types'
import type { ButtonIcon } from '../icons/IconSlot'

/** One node: a folder (has children, opens/closes) or a leaf (a link to a page) */
export type TreeNode = {
  id: string
  label: string
  /** The one icon left of the label. Folders: it turns into the open/closed arrow on hover */
  icon?: ButtonIcon
  /** Folder: its icon while open, e.g. LuFolderOpen (defaults to `icon`) */
  openIcon?: ButtonIcon
  /** The page it opens (defaults to the panel's page when `panel` is set). A folder with one is a link; its arrow opens/closes it */
  to?: string
  /** Folder: its child nodes */
  children?: TreeNode[]
  /** The workspace panel it represents (leaf or folder) */
  panel?: PanelRef
  /** With `panel`: may be dragged onto the current page or a panel to combine them */
  draggable?: boolean
}

/** What a row is right now; passed to the function that chooses its right icons */
export type TreeRowState = { isFolder: boolean; isOpen: boolean }

/**
 * When an icon is visible:
 * - always: all the time
 * - hover:  only while its row is hovered or holds keyboard focus (its space stays reserved, so
 *           nothing in the row moves when it appears)
 */
export type TreeIconShow = 'always' | 'hover'

/**
 * Its own background:
 * - none:   never
 * - hover:  while the pointer is on the icon itself (like the folder arrow)
 * - always: all the time (e.g. to mark a state)
 */
export type TreeIconBg = 'none' | 'hover' | 'always'

type TreeIconLook = {
  /** Default 'always' */
  show?: TreeIconShow
  /** Default 'none'; 'hover' when it is clickable */
  bg?: TreeIconBg
}

/** One action in a right icon's menu */
export type TreeMenuItem = {
  label: string
  icon?: ButtonIcon
  onClick: () => void
  /** Destructive (e.g. Delete): shown in the danger colour */
  danger?: boolean
}

/**
 * An icon on the right of a row, outside the row's button/link. It can be:
 * - decoration / a sign: `icon` (no onClick, no menu)
 * - a button: `icon` + `onClick`
 * - a menu of actions below it: `menu`. No `icon`: a menu's trigger is always the ⋯ whose dots fly
 *   out into the items and leave a ✕ that closes it (menuAnimation.ts)
 * A clickable icon needs a `label` (it has no visible text).
 */
export type TreeRightIcon =
  | (TreeIconLook & { icon: ButtonIcon; label?: string; onClick?: undefined; menu?: undefined })
  | (TreeIconLook & { icon: ButtonIcon; label: string; onClick: () => void; menu?: undefined })
  | (TreeIconLook & { label: string; menu: TreeMenuItem[]; icon?: undefined; onClick?: undefined })

/** The right icons of every row, chosen per node; set once on TreeView (the left icon is the node's) */
export type TreeIcons = {
  /** Right end of the row */
  right?: (node: TreeNode, state: TreeRowState) => TreeRightIcon[]
}
