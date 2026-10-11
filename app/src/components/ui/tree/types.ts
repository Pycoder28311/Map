import type { PanelRef } from '../../../features/workspace/types'
import type { IconEffects } from '../icons/iconEffects'
import type { ButtonIcon, PlainIcon } from '../icons/IconSlot'

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
  /** Can be picked up at all: dragged within the tree (when the tree allows it) and, with `panel`,
   *  onto the current page or a panel to combine them */
  draggable?: boolean
  /** Never takes a drop into it (e.g. Dashboard, a map) */
  locked?: boolean
  /** A small count after the name (e.g. how many notes are linked to it) */
  badge?: number
}

/** Where a drop would land on a row */
export type TreeDropPosition = 'before' | 'after' | 'into'

/**
 * Drag & drop inside a tree (TreeView's `dnd`). The tree only draws; the owner decides what may go
 * where (from the dnd-kit drag events) and passes the result back as `target`.
 */
export type TreeDnd = {
  /** A row's droppable data (dnd-kit `row:<id>`); undefined: it takes no drops */
  dropData?: (node: TreeNode) => Record<string, unknown> | undefined
  /** Drag data for rows that aren't links (e.g. a folder without a page); undefined: not draggable.
   *  Links drag through `renderLink` (e.g. PanelDragLink) */
  dragData?: (node: TreeNode) => Record<string, unknown> | undefined
  /** The row being dragged: its place stays empty (the lifted copy follows the pointer) */
  draggingId?: string | null
  /** Where the current drag would land: an insertion line (before/after) or a ring (into) */
  target?: { nodeId: string; position: TreeDropPosition } | null
  /** Rows whose lid is up (something is falling in): they show their open icon */
  lidOpen?: (nodeId: string) => boolean
  /**
   * A round drop node sliding out of a row's right side (e.g. "link a note here"): its droppable id,
   * drop key (fall-into effect), data, icon, label, whether it shows and whether it's targeted.
   * undefined: none on that row
   */
  linkNode?: (node: TreeNode) =>
    | { id: string; dropKey: string; data: Record<string, unknown>; icon: PlainIcon; label: string; state: 'hidden' | 'faint' | 'shown'; active: boolean }
    | undefined
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

/** + hoverEffect / clickEffect (IconEffects): clickable icons only, both on unless turned off */
type TreeIconLook = IconEffects & {
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

/** Actions that belong together; the menu draws a line between groups */
export type TreeMenuGroup = TreeMenuItem[]

/**
 * An icon on the right of a row, outside the row's button/link. It can be:
 * - decoration / a sign: `icon` (no onClick, no menu)
 * - a button: `icon` + `onClick`
 * - a menu of actions below it: `menu`, in groups (a line between them). No `icon`: a menu's trigger is always the ⋯ whose dots fly
 *   out into the items and leave a ✕ that closes it (menuAnimation.ts)
 * A clickable icon needs a `label` (it has no visible text).
 */
export type TreeRightIcon =
  | (TreeIconLook & { icon: ButtonIcon; label?: string; onClick?: undefined; menu?: undefined })
  | (TreeIconLook & { icon: ButtonIcon; label: string; onClick: () => void; menu?: undefined })
  | (TreeIconLook & { label: string; menu: TreeMenuGroup[]; icon?: undefined; onClick?: undefined })

/** The right icons of every row, chosen per node; set once on TreeView (the left icon is the node's) */
export type TreeIcons = {
  /** Right end of the row */
  right?: (node: TreeNode, state: TreeRowState) => TreeRightIcon[]
}
