// Shared by every icon of a tree row (TreeRowIcon on the left; TreeIcon and TreeMenu on the right).
// Full class strings so Tailwind can detect them at build time.
import type { TreeIconBg, TreeIconShow } from './types'

/** The same box for every icon, so they line up; -my: its padding never makes the row taller */
export const ICON_BOX =
  'inline-flex shrink-0 -my-(--btn-close-p) p-(--btn-close-p) rounded-(--btn-close-radius) ' +
  'transition-[opacity,background-color] duration-200 ease-out'

/** Keyboard focus ring of an icon that is a button */
export const ICON_BUTTON = 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** When a right icon is visible (TreeIconShow) */
export const ICON_SHOW: Record<TreeIconShow, string> = {
  always: '',
  // opacity, not display: the space stays reserved and a focused button can still be reached by Tab.
  // Keyboard focus only (:focus-visible): after a click the row keeps focus, which must not keep them showing
  hover:
    'opacity-0 pointer-events-none group-hover/row:opacity-100 group-hover/row:pointer-events-auto ' +
    'group-has-[:focus-visible]/row:opacity-100 group-has-[:focus-visible]/row:pointer-events-auto',
}

/** A right icon's own background (TreeIconBg) */
export const ICON_BG: Record<TreeIconBg, string> = {
  none: '',
  hover: 'hover:bg-fg/10',
  always: 'bg-fg/10',
}
