// The row menu's opening animation (TreeMenu): one dot per item leaves the ⋯ trigger, slides down to
// its item and pops into the button; a moment after the last dot lands, the trigger's − appears. Closing: the menu goes at
// once and the − splits back into the three dots. Keyframes in styles/animations.css, sizes in
// styles/tokens.css. Full class strings so Tailwind can detect them at build time.
import type { CSSProperties } from 'react'

/**
 * The trigger's ⋯, as Lucide draws it (24×24): three dots at these x, on y = 12. Item i flies out of
 * dot i % 3, so more items keep cycling through them.
 */
export const TRIGGER_DOTS_X = [5, 12, 19] as const
const TRIGGER_DOTS = TRIGGER_DOTS_X.length

// The trigger follows whether its menu is open: `group-has-[:popover-open]/menu` (the trigger and the
// menu share `group/menu`). Written out in full in every class: Tailwind only finds whole class names.

// SVG parts scale around their own box (not the whole icon's)
const OWN_BOX = '[transform-box:fill-box]'

/**
 * A dot of the ⋯ (--k: 0, 1, 2). Opening: leaves (fades and shrinks) the moment its first item's dot
 * flies out. Closing: swells back while its piece of the − shrinks into it.
 */
export const TRIGGER_DOT =
  `${OWN_BOX} origin-center transition-[opacity,scale] duration-200 ease-out ` +
  'group-has-[:popover-open]/menu:opacity-0 group-has-[:popover-open]/menu:scale-50 ' +
  'group-has-[:popover-open]/menu:[transition-delay:calc(var(--k)*var(--menu-stagger))] motion-reduce:transition-none'

/**
 * The − (a click on it closes the menu), in three pieces, one per dot (24×24, y 11–13; they overlap a
 * little so the joins never show). Each grows out of / shrinks into its dot's centre (origin), so:
 * opening, they stretch into one line --menu-minus-delay after the last item's dot has landed (it
 * lands at 55% of its animation; --menu-count: see menuVars); closing, the line splits into the
 * three dots.
 */
export const TRIGGER_BARS = [
  { x: 4, width: 5, origin: 'origin-[20%_50%]' }, // dot at x 5
  { x: 8, width: 8, origin: 'origin-center' }, // dot at x 12
  { x: 15, width: 5, origin: 'origin-[80%_50%]' }, // dot at x 19
] as const

export const TRIGGER_BAR =
  `${OWN_BOX} scale-x-0 transition-[scale] duration-200 ease-out ` +
  'group-has-[:popover-open]/menu:scale-x-100 ' +
  'group-has-[:popover-open]/menu:[transition-delay:calc((var(--menu-count,3)-1)*var(--menu-stagger)+var(--menu-item-duration)*0.55+var(--menu-minus-delay))] ' +
  'motion-reduce:transition-none'

/** The trigger stays visible (and highlighted) while its menu is open, even when the pointer leaves the row */
export const TRIGGER_WHILE_OPEN =
  'group-has-[:popover-open]/row:opacity-100 group-has-[:popover-open]/row:pointer-events-auto group-has-[:popover-open]/row:bg-fg/10'

/** The menu's background, border and shadow fill in once the first dot arrives */
export const PANEL = 'animate-menu-panel motion-reduce:animate-none'

/** The flying dot of an item: rests on the item's icon spot; the animation brings it from the trigger */
export const DOT =
  'pointer-events-none absolute top-[calc(50%-var(--menu-dot)/2)] left-[calc(var(--menu-item-px)+var(--btn-icon-size)/2-var(--menu-dot)/2)] ' +
  'size-(--menu-dot) rounded-full bg-fg animate-menu-dot motion-reduce:hidden'

/** An item's icon + label: pops out of its dot (growing from the left, where the dot is) */
export const ITEM_CONTENT = 'flex items-center gap-(--btn-gap) origin-left animate-menu-pop motion-reduce:animate-none'

/** On the trigger + menu group: how many items (when the last dot lands, for the − ) */
export const menuVars = (count: number): CSSProperties => ({ '--menu-count': count }) as CSSProperties

/** Per item: its position (its dot's path and its delay) and which trigger dot it comes from */
export const itemVars = (index: number): CSSProperties =>
  ({ '--i': index, '--dot': (index % TRIGGER_DOTS) - 1 }) as CSSProperties

/** Per dot of the trigger's ⋯: its index, for when it leaves */
export const triggerDotVars = (index: number): CSSProperties => ({ '--k': index }) as CSSProperties

/**
 * Tells the dots where they start: the trigger's centre, measured from the menu's top-left corner.
 * Called when the menu opens, once its own position is known.
 */
export function setTriggerOrigin(menu: HTMLElement, trigger: DOMRect, menuLeft: number, menuTop: number) {
  menu.style.setProperty('--trigger-x', `${trigger.left + trigger.width / 2 - menuLeft}px`)
  menu.style.setProperty('--trigger-y', `${trigger.top + trigger.height / 2 - menuTop}px`)
}
