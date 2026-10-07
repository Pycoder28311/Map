import { LuChevronDown, LuChevronRight } from 'react-icons/lu'
import type { ButtonIcon } from '../icons/IconSlot'
import { ICON_BOX, ICON_BUTTON } from './treeIconStyles'

// Full class strings so Tailwind can detect them at build time.
// Folders: the node's icon by default (openIcon while open); the arrow in its place only while the
// row is hovered, or holds keyboard focus (:focus-visible, so not after a mouse click: a clicked row
// keeps focus, which would leave the arrow showing).
// Both are stacked in one grid cell, so swapping them never moves anything.
const ICON_SWAP = 'transition-opacity duration-150 ease-out group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0'
const ARROW_SWAP =
  'opacity-0 transition-opacity duration-150 ease-out group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100'

type Props = {
  /** The node's icon (an open folder's openIcon) */
  icon?: ButtonIcon
  /** Folders only: turns into the open/closed arrow on hover */
  folder?: { isOpen: boolean }
  /** Folder with a page of its own: the icon is a button that opens/closes it (label: its name) */
  toggle?: { onClick: () => void; label: string }
}

/**
 * The one icon on the left of a tree row. Leaves: the node's icon. Folders: the node's icon, which
 * becomes the arrow while the row is hovered (a folder without an icon always shows the arrow).
 */
export default function TreeRowIcon({ icon: Icon, folder, toggle }: Props) {
  const glyph = 'size-(--btn-icon-size) col-start-1 row-start-1'
  const Arrow = folder?.isOpen ? LuChevronDown : LuChevronRight

  const inner = folder ? (
    <span className="grid">
      {Icon && <Icon className={`${glyph} ${ICON_SWAP}`} />}
      <Arrow className={`${glyph} ${Icon ? ARROW_SWAP : ''}`} />
    </span>
  ) : (
    Icon && <Icon className="size-(--btn-icon-size)" />
  )

  // The arrow's own hover background, like the other tree icons
  const bg = folder ? 'hover:bg-fg/10' : ''

  if (toggle) {
    return (
      <button
        type="button"
        aria-label={toggle.label}
        title={toggle.label}
        onClick={toggle.onClick}
        className={`${ICON_BOX} ${bg} ${ICON_BUTTON}`}
      >
        {inner}
      </button>
    )
  }
  return (
    <span aria-hidden className={`${ICON_BOX} ${bg}`}>
      {inner}
    </span>
  )
}
