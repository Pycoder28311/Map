import { LuChevronRight } from 'react-icons/lu'
import { ICON_EFFECT_GROUP, iconEffectClass } from '../icons/iconEffects'
import type { ButtonIcon } from '../icons/IconSlot'
import { ICON_BOX, ICON_BUTTON } from './treeIconStyles'

// Full class strings so Tailwind can detect them at build time.
// The box is the row's first square (the row's full height and --sidebar-row wide): its hover background fills it, and the
// icon is centred in it, exactly where it was (the right icons' box, ICON_BOX, is a padded one instead)
const BOX = 'flex size-full shrink-0 items-center justify-center rounded-(--btn-close-radius) transition-[opacity,background-color] duration-200 ease-out'
// Folders: the node's icon by default (openIcon while open); the arrow in its place only while the
// row is hovered, or holds keyboard focus (:focus-visible, so not after a mouse click: a clicked row
// keeps focus, which would leave the arrow showing).
// Both are stacked in one grid cell, so swapping them never moves anything.
const ICON_SWAP = 'group-hover/row:opacity-0 group-has-[:focus-visible]/row:opacity-0'
const ARROW_SWAP = 'opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100'
type Props = {
  /** The node's icon (an open folder's openIcon) */
  icon?: ButtonIcon
  /** Folders only: turns into the open/closed arrow on hover */
  folder?: { isOpen: boolean }
  /** Folder with a page of its own: the icon is a button that opens/closes it (label: its name) */
  toggle?: { onClick: () => void; label: string }
  /** A folder's icon, which sits at the row's start as its own square (TreeItem) instead of inside the row's content */
  square?: boolean
}

/**
 * The one icon on the left of a tree row. Leaves: the node's icon. Folders: the node's icon, which
 * becomes the arrow while the row is hovered (a folder without an icon always shows the arrow).
 */
export default function TreeRowIcon({ icon: Icon, folder, toggle, square }: Props) {
  const box = square ? BOX : ICON_BOX
  // The size follows --tree-row-icon: bigger while the sidebar is closed, growing with its animation. One transition for all of
  // it: size, the icon/arrow swap (150ms) and the arrow's quarter turn when the folder opens (260ms, the Zen reel's chevron curve)
  const SIZE = 'size-(--tree-row-icon)'
  const glyph = `${SIZE} col-start-1 row-start-1 [transition:width_var(--tree-compact-duration)_ease-out,height_var(--tree-compact-duration)_ease-out,opacity_150ms_ease-out,rotate_260ms_cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none`

  const inner = folder ? (
    <span className="grid">
      {Icon && <Icon className={`${glyph} ${ICON_SWAP}`} />}
      <LuChevronRight className={`${glyph} ${Icon ? ARROW_SWAP : ''} ${folder.isOpen ? 'rotate-90' : ''}`} />
    </span>
  ) : (
    Icon && <Icon className={`${SIZE} transition-[width,height] duration-(--tree-compact-duration) ease-out motion-reduce:transition-none`} />
  )

  // The arrow's own hover background, like the other tree icons
  const bg = folder ? 'hover-faint' : ''

  if (toggle) {
    return (
      <button
        type="button"
        aria-label={toggle.label}
        title={toggle.label}
        onClick={toggle.onClick}
        className={`${ICON_EFFECT_GROUP} ${box} ${bg} ${ICON_BUTTON}`}
      >
        {/* Hover/click effects only when it's a button of its own */}
        <span className={`flex ${iconEffectClass()}`}>{inner}</span>
      </button>
    )
  }
  return (
    <span aria-hidden className={`${box} ${bg}`}>
      {inner}
    </span>
  )
}
