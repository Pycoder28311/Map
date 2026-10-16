// Shared by Button (<button>), ButtonLink (<Link> / <a>) and NavButton (<NavLink>), so links that
// look like buttons match exactly. Full class strings so Tailwind can detect them at build time.

/** Keyboard focus ring of a button that has no other look of its own */
export const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg hover:bg-(--btn-primary-hover-bg) [box-shadow:var(--btn-primary-shadow)] ' +
    'enabled:hover:[box-shadow:var(--btn-hover-inset-dark),var(--btn-primary-shadow)] ' +
    'enabled:active:[box-shadow:var(--btn-active-inset-dark),var(--btn-primary-shadow)]',
  secondary:
    'bg-fill hover:bg-(--btn-secondary-hover-bg) enabled:hover:[box-shadow:var(--btn-hover-inset-light)] ' +
    'enabled:active:[box-shadow:var(--btn-active-inset-light)]',
  ghost:
    'hover:bg-(--btn-ghost-hover-bg) enabled:hover:[box-shadow:var(--btn-hover-inset-light)] ' +
    'enabled:active:[box-shadow:var(--btn-active-inset-light)]',
  /** The chosen one of a group (an outlined, tinted button); `pickClass` below is the same look for the pickable rows */
  selected: 'border border-accent bg-accent/10',
} as const

/** Look of the current page's link (NavButton) */
const ACTIVE = {
  primary: 'bg-accent-hover',
  secondary: 'bg-fill-strong',
  ghost: 'bg-fill',
  selected: 'bg-accent/20',
} as const

export type ButtonVariant = keyof typeof VARIANTS

const BASE =
  'group/main inline-flex items-center justify-center gap-(--btn-gap) rounded-(--btn-radius) py-(--pill-py) ' +
  'border-(length:--btn-border-w) border-(--btn-border-c) ' +
  'text-body cursor-pointer transition-[color,background-color,border-color,fill,stroke,outline-color,text-decoration-color,box-shadow] duration-200 ease-out ' +
  `${FOCUS_RING} ` +
  'disabled:cursor-not-allowed disabled:opacity-50'

const ICON_BASE =
  'inline-flex shrink-0 items-center justify-center p-(--btn-close-p) rounded-(--btn-close-radius) ' +
  'border-(length:--btn-border-w) border-(--btn-border-c) ' +
  'cursor-pointer transition-[color,background-color,border-color,fill,stroke,outline-color,text-decoration-color,box-shadow] duration-200 ease-out ' +
  `${FOCUS_RING} ` +
  'disabled:cursor-not-allowed disabled:opacity-40'

/** Small rounded background behind an icon, only while the pointer is on the icon itself (the theme's X, tree arrows) */
export const ICON_HOVER =
  'inline-flex shrink-0 p-(--btn-close-p) rounded-(--btn-close-radius) transition-colors duration-200 ease-out hover-faint'

/** Class string of a square icon-only button (IconButton), same colours as the variants above */
export function iconButtonClass(variant: ButtonVariant, extra = '') {
  return `${ICON_BASE} ${VARIANTS[variant]} ${extra}`
}

/** Class string of a themed button; with an icon the start padding is the theme's tighter one */
export function buttonClass(variant: ButtonVariant, hasIcon: boolean, extra = '', active = false) {
  const padding = hasIcon ? 'ps-(--btn-px) pe-(--pill-px)' : 'px-(--pill-px)'
  return `${BASE} ${padding} ${VARIANTS[variant]} ${active ? ACTIVE[variant] : ''} ${extra}`
}

/** The background of a sidebar row (the theme's --tree-row-bg: none in the base theme, a solid colour in others), also for the
 *  buttons that sit among the rows (Trash, Show more); its hover background keeps that colour instead of going see-through */
export const TREE_ROW_LOOK =
  '[background-color:var(--tree-row-bg)] [outline:var(--tree-row-outline)] [outline-offset:-1px] [--btn-ghost-hover-bg:var(--tree-row-hover-bg)] [--hover-fill-bg:var(--tree-row-hover-bg)]'

// ---- Pickable rows / options (a list of choices where one is "selected") ----

/** The selected one of a group of pickable rows or options */
export const SELECTED = 'border-accent bg-accent/10'

/** An unselected pickable row */
export const UNSELECTED = 'border-line hover-fill'

/** Selected / unselected look of a pickable row (`off`: another unselected look, e.g. with no outline) */
export const pickClass = (on: boolean, off = UNSELECTED) => (on ? SELECTED : off)

/** A bordered, full-width pickable row (the sidebar's line, border and option pickers) */
export const PICK_ROW = 'flex w-full items-center rounded-(--field-radius) border px-2 py-1 transition-colors'

/** The same with a gap between its icon / sample and its name */
export const PICK_ROW_WIDE = `${PICK_ROW} gap-3 text-start`

// ---- Other buttons that repeat across the app ----

/** A full-width row of a list of buttons (layers, selection, branches, text styles) */
export const LIST_ITEM =
  'flex w-full cursor-pointer items-center gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover-fill'

/** A quiet text-only button in small text (show more, change) */
export const TEXT_BUTTON = 'cursor-pointer text-small text-fg-muted hover:text-fg'

/** The pill-shaped buttons: round ends, a quiet fill on hover */
export const PILL_BUTTON = 'inline-flex cursor-pointer items-center rounded-(--radius-pill)'
