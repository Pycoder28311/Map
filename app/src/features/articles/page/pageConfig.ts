// The article page's sizes and timings, in one place.

/** How long the left column takes to slide open or closed (ms): its transition is duration-300 */
export const SIDE_SLIDE_MS = 300

/** Below this page width (px) the left column (Contents, Messages, Notes) is not beside the article: its round buttons open it over the text */
export const SIDE_MIN_WIDTH = 1088

/** The room between the text and the Info box it flows around (px: the box's ms-4) */
export const INFO_GAP = 16

/** The banner's height (`--banner-h`, which the round buttons follow): with a picture, and without one on a reader's and an editor's page */
export const BANNER_HEIGHT = { picture: '11rem', reader: '3rem', editor: '9rem' }

/** A title's most characters */
export const TITLE_MAX = 200

/** A message opened by the pointer resting on its words closes this long after the pointer left them and its panel (ms) */
export const MESSAGE_HOVER_CLOSE_MS = 250
