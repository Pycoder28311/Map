// The row menu's opening animation (TreeMenu): the ⋯ becomes a queue of dots, one per item. The front
// (left) dot slides down to its item and pops into the button while the queue moves up one place to
// take its spot, a new dot coming in at the back; a moment after the last dot lands, the trigger's − appears. Closing: the menu goes at
// once and the − splits back into the three dots. Keyframes in styles/animations.css, sizes in
// styles/tokens.css. Full class strings so Tailwind can detect them at build time.
import type { CSSProperties } from 'react'

/**
 * The trigger's ⋯, as Lucide draws it (24×24): three dots at these x, on y = 12. When the menu opens,
 * the menu's own dots (DOT_SLOT) take their places and the queue starts.
 */
export const TRIGGER_DOTS_X = [5, 12, 19] as const

// The trigger follows whether its menu is open: `group-has-[:popover-open]/menu` (the trigger and the
// menu share `group/menu`). Written out in full in every class: Tailwind only finds whole class names.

// SVG parts scale around their own box (not the whole icon's)
const OWN_BOX = '[transform-box:fill-box]'

/**
 * A dot of the ⋯. Opening: gone at once (the menu's dots, drawn on the same spots, are the queue).
 * Closing: swells back while its piece of the − shrinks into it.
 */
export const TRIGGER_DOT =
  `${OWN_BOX} origin-center transition-[opacity,scale] duration-200 ease-out ` +
  'group-has-[:popover-open]/menu:opacity-0 group-has-[:popover-open]/menu:scale-50 ' +
  'group-has-[:popover-open]/menu:duration-0 motion-reduce:transition-none'

/**
 * The − (a click on it closes the menu), in three pieces, one per dot (24×24, y 11–13; they overlap a
 * little so the joins never show).
 * - opening: once the queue is done (the last item fully shown, --menu-minus-delay later;
 *   --menu-count: see menuVars), it grows out of the icon's centre as one line (all pieces scale
 *   around the centre of the whole icon)
 * - closing: each piece shrinks into its own dot's centre (origin), so the line splits into the ⋯
 */
export const TRIGGER_BARS = [
  { x: 4, width: 5, origin: 'origin-[20%_50%]' }, // dot at x 5
  { x: 8, width: 8, origin: 'origin-center' }, // dot at x 12
  { x: 15, width: 5, origin: 'origin-[80%_50%]' }, // dot at x 19
] as const

export const TRIGGER_BAR =
  `${OWN_BOX} scale-x-0 transition-[scale] duration-200 ease-out ` +
  'group-has-[:popover-open]/menu:scale-x-100 group-has-[:popover-open]/menu:[transform-box:view-box] group-has-[:popover-open]/menu:origin-center ' +
  'group-has-[:popover-open]/menu:[transition-delay:calc((var(--menu-count,3)-1)*var(--menu-stagger)+var(--menu-item-duration)+var(--menu-minus-delay))] ' +
  'motion-reduce:transition-none'

/** The trigger stays visible (and highlighted) while its menu is open, even when the pointer leaves the row */
export const TRIGGER_WHILE_OPEN =
  'group-has-[:popover-open]/row:opacity-100 group-has-[:popover-open]/row:pointer-events-auto group-has-[:popover-open]/row:bg-fg/10'

/**
 * The menu's look (background, border, shadow), as a layer behind the items: the menu itself stays
 * see-through and unclipped, so the dots can fly in from above it. It fills in once the first dot
 * arrives, one item tall, then grows down with the items as they appear, ending at the menu's full
 * size (its border sits on the menu's border box: -inset by its width).
 */
export const BACKDROP =
  'pointer-events-none absolute -z-1 -top-(--menu-border) -inset-x-(--menu-border) h-[calc(100%+2*var(--menu-border))] ' +
  'rounded-(--menu-radius) border-(length:--menu-border) border-line bg-surface shadow-lg ' +
  'animate-menu-backdrop motion-reduce:animate-none'

/**
 * The line between two groups: drawn from the left as the growing backdrop reaches it (--i: index
 * of the first item below it)
 */
export const SEPARATOR_IN = 'origin-left animate-menu-sep motion-reduce:animate-none'

/**
 * An item's dot, in two nested parts (their moves add up):
 * - DOT_SLOT: its place in the queue. Starts --i places behind the front (to the right) and moves up
 *   with the queue until it's at the front; fades in as it enters the ⋯'s last spot (places past the
 *   three dots wait unseen)
 * - DOT: from the front of the queue, slides down to the item's icon spot, swells and fades there
 *   as the item opens out of it (BLOOM, ITEM_CONTENT)
 */
export const DOT_SLOT =
  'pointer-events-none absolute top-[calc(50%-var(--menu-dot)/2)] left-[calc(var(--menu-item-px)+var(--btn-icon-size)/2-var(--menu-dot)/2)] ' +
  'size-(--menu-dot) animate-menu-queue motion-reduce:hidden'
export const DOT = 'block size-full rounded-full bg-fg animate-menu-dot'

/**
 * Where the dot lands, the button opens out of it: its background spreads from the dot as a growing
 * circle to the whole item, then fades (the item's normal look is no background)
 */
export const BLOOM =
  'pointer-events-none absolute inset-0 rounded-(--menu-item-radius) bg-fill animate-menu-bloom motion-reduce:hidden'

/** An item's icon + label: revealed by the same growing circle, a moment after the background */
export const ITEM_CONTENT = 'relative flex items-center gap-(--menu-icon-gap) animate-menu-pop motion-reduce:animate-none'

/** On the trigger + menu group: how many items (when the last dot lands, for the − ) */
export const menuVars = (count: number): CSSProperties => ({ '--menu-count': count }) as CSSProperties

/**
 * Per item: its place in the queue (= when it leaves) and its position: index among all items, and
 * the group lines above it
 */
export const itemVars = (index: number, linesAbove: number): CSSProperties =>
  ({ '--i': index, '--seps': linesAbove }) as CSSProperties

/**
 * Tells the dots where they start: the trigger's centre, measured from the menu's top-left corner.
 * Called when the menu opens, once its own position is known.
 */
export function setTriggerOrigin(menu: HTMLElement, trigger: DOMRect, menuLeft: number, menuTop: number) {
  menu.style.setProperty('--trigger-x', `${trigger.left + trigger.width / 2 - menuLeft}px`)
  menu.style.setProperty('--trigger-y', `${trigger.top + trigger.height / 2 - menuTop}px`)
}
