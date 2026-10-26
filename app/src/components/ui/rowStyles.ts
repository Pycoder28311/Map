// Rows and options that are clicked but aren't buttons (list rows, pickers, sidebar rows): they keep the theme's look
// (tokens.css, themes/). The buttons are components/ui/buttons/ (styles/buttons.css). Full class strings so Tailwind can
// detect them at build time.

/** The look of a sidebar row (an object, Trash, Show more): the text field's (styles/fields.css) */
export const TREE_ROW_LOOK = 'ui-field-row'

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

/** A full-width row of a list of choices (layers, selection, branches, text styles) */
export const LIST_ITEM =
  'flex w-full cursor-pointer items-center gap-2 rounded-(--corner-sm) px-2 py-1.5 text-start hover-fill'

/** Keyboard focus ring of a row or option */
export const FOCUS_RING = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/** A sidebar row's link or button (a tree row's link, Trash, Show more): layout only; the look is the row's (TREE_ROW_LOOK) */
export const SIDEBAR_ROW =
  'group/main inline-flex min-h-(--sidebar-row) items-center gap-(--btn-gap) py-(--pill-py) ps-(--tree-row-px) pe-(--pill-px) text-body cursor-pointer transition-[padding] duration-(--sidebar-duration) ease-out motion-reduce:transition-none ' +
  `disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`
