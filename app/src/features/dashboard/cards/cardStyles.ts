// The Dashboard cards' boxes: every card, of every look, a square of the same size, so a row lines up (each look arranges its own content inside)
const CARD_BASE =
  'group/card relative flex shrink-0 snap-start flex-col overflow-hidden rounded-(--card-radius) text-start shadow-sm ring-1 ring-line'
const PADDED = 'gap-2 p-2'
/** The card size: a square */
export const CARD_SIZE = 'size-48'
export const CARD = `${CARD_BASE} ${PADDED} ${CARD_SIZE}`
/** A card of a given size (for the empty state and the placeholders of a row) */
export const cardOf = (size: string, padded = true) => `${CARD_BASE} ${padded ? PADDED : ''} ${size}`

/** What sits on a card (its ⋯ menu): shown on hover or keyboard focus, and while its menu is open */
export const ON_HOVER = 'opacity-0 transition-opacity group-hover/card:opacity-100 group-focus-within/card:opacity-100 has-[:popover-open]:opacity-100'
