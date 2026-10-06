// The field look of the "Map buttons" theme, shared by TextField and SearchInput.
// Full class strings so Tailwind can detect them at build time.

const SHELL =
  'flex items-center gap-(--field-gap) h-(--field-h) px-(--field-px) rounded-(--field-radius) bg-white ' +
  'has-[:disabled]:bg-gray-100 has-[:disabled]:text-gray-500'

/** The box around the input */
export const FIELD_VARIANTS = {
  border: `${SHELL} border border-gray-300 transition-colors duration-200 ease-out focus-within:border-gray-400`,
  shadow: `${SHELL} shadow-md focus-within:ring-2 focus-within:ring-black/10`,
} as const

export type FieldVariant = keyof typeof FIELD_VARIANTS

/** The input itself: borderless, fills the box */
export const FIELD_INPUT = 'flex-1 min-w-0 bg-transparent outline-none text-body placeholder:text-gray-500'
