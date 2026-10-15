// The fonts a text can use. Only fonts a browser has by itself (no downloads): each has fallbacks, so a text always shows.
// A text keeps its font as the index here, so new fonts are only ever added at the end. Pure (fonts.test.ts).

export type FontChoice = { name: string; stack: string }

const SANS = 'sans-serif'
const SERIF = 'serif'
const MONO = 'monospace'

export const FONTS: FontChoice[] = [
  { name: 'System', stack: 'system-ui, sans-serif' },
  { name: 'Arial', stack: `Arial, Helvetica, ${SANS}` },
  { name: 'Helvetica', stack: `Helvetica, Arial, ${SANS}` },
  { name: 'Verdana', stack: `Verdana, Geneva, ${SANS}` },
  { name: 'Tahoma', stack: `Tahoma, Geneva, ${SANS}` },
  { name: 'Trebuchet MS', stack: `"Trebuchet MS", ${SANS}` },
  { name: 'Segoe UI', stack: `"Segoe UI", ${SANS}` },
  { name: 'Calibri', stack: `Calibri, Carlito, ${SANS}` },
  { name: 'Gill Sans', stack: `"Gill Sans", "Gill Sans MT", ${SANS}` },
  { name: 'Impact', stack: `Impact, "Arial Black", ${SANS}` },
  { name: 'Georgia', stack: `Georgia, ${SERIF}` },
  { name: 'Times New Roman', stack: `"Times New Roman", Times, ${SERIF}` },
  { name: 'Palatino', stack: `Palatino, "Palatino Linotype", "Book Antiqua", ${SERIF}` },
  { name: 'Garamond', stack: `Garamond, "EB Garamond", ${SERIF}` },
  { name: 'Baskerville', stack: `Baskerville, "Baskerville Old Face", ${SERIF}` },
  { name: 'Cambria', stack: `Cambria, Caladea, ${SERIF}` },
  { name: 'Courier New', stack: `"Courier New", Courier, ${MONO}` },
  { name: 'Lucida Console', stack: `"Lucida Console", Monaco, ${MONO}` },
  { name: 'Consolas', stack: `Consolas, "Liberation Mono", ${MONO}` },
  { name: 'Comic Sans MS', stack: `"Comic Sans MS", "Comic Sans", cursive` },
  { name: 'Brush Script MT', stack: `"Brush Script MT", "Brush Script Std", cursive` },
  { name: 'Papyrus', stack: `Papyrus, fantasy` },
  { name: 'Serif', stack: SERIF },
  { name: 'Sans serif', stack: SANS },
  { name: 'Monospace', stack: MONO },
  { name: 'Cursive', stack: 'cursive' },
]

/** The font a text has when it names none */
export const DEFAULT_FONT = 0

/** The CSS font-family of font number `index` (the default's for none or one this version does not know) */
export const stackOf = (index: number | undefined) => (FONTS[index ?? DEFAULT_FONT] ?? FONTS[DEFAULT_FONT]).stack

/** The lightest and heaviest weight, and the step between them (CSS's 100–900) */
export const WEIGHT_MIN = 100
export const WEIGHT_MAX = 900
export const WEIGHT_NORMAL = 400
export const WEIGHT_BOLD = 700
