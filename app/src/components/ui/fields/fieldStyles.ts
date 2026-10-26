// The field look: the box is `.ui-field` (styles/fields.css: the colours, shadow and corners, from Dark Fantasy UI's
// minimal input); only the layout of what is in it is here. Shared by TextField and SearchInput.
// Full class strings so Tailwind can detect them at build time.

/** The box around the input */
export const FIELD_BOX = 'ui-field flex items-center gap-(--field-gap) h-(--field-h) px-(--field-px)'

/** The input itself: borderless, fills the box */
export const FIELD_INPUT = 'flex-1 min-w-0 bg-transparent outline-none text-body'
