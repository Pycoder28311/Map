// The Dashboard cards' boxes: every card in a row the same size, so it lines up (each look arranges its own content inside)
const CARD_BASE =
  'group/card relative flex shrink-0 snap-start flex-col overflow-hidden rounded-(--card-radius) text-start shadow-sm ring-1 ring-line'
const PADDED = 'gap-2 p-2'
/** The usual card size, and the wider, shorter comment cards (a note's text) */
export const CARD_SIZE = 'h-52 w-44'
export const COMMENT_SIZE = 'h-40 w-72'
export const CARD = `${CARD_BASE} ${PADDED} ${CARD_SIZE}`
/** A card of a given size (for the empty state and the placeholders of a row) */
export const cardOf = (size: string, padded = true) => `${CARD_BASE} ${padded ? PADDED : ''} ${size}`
