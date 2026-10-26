// Which Dark Fantasy button each variant is. The look itself is styles/buttons.css; change a variant's look here,
// in one line. Used by Button, ButtonLink, NavButton, IconButton (and ExtendMenu, Dropdown).

const LOOK = {
  /** Venom: the main action of a place */
  primary: 'ui-btn-venom',
  /** Venom: making something new (Add, Create) */
  create: 'ui-btn-venom',
  /** Stone: the other actions */
  secondary: 'ui-btn-stone',
  /** Shade: quiet actions, toolbars, navigation */
  ghost: 'ui-btn-shade',
  /** Shade, shown as chosen (the hover look, kept: .ui-btn-selected; aria-pressed="true" does the same) */
  selected: 'ui-btn-shade',
  /** Underline: a text-only action in running text (Show more, Change) */
  text: 'ui-btn-underline',
} as const

export type ButtonVariant = keyof typeof LOOK

/** Tight rows: a smaller button (.ui-btn-sm) */
export type ButtonSize = 'md' | 'sm'

/** Class string of a button of this variant (`group/main`: icon animations follow its hover) */
export function buttonClass(variant: ButtonVariant, extra = '', size: ButtonSize = 'md') {
  return `group/main ui-btn ${LOOK[variant]} ${variant === 'selected' ? 'ui-btn-selected' : ''} ${size === 'sm' ? 'ui-btn-sm' : ''} ${extra}`
}

/** Class string of a square button with only an icon (IconButton) */
export function iconButtonClass(variant: ButtonVariant, extra = '', size: ButtonSize = 'md') {
  return buttonClass(variant, `ui-btn-square ${extra}`, size)
}

/** Class string of a split button (SplitButton): a Venom button in two pieces */
export function splitButtonClass(extra = '', size?: ButtonSize) {
  return buttonClass('create', `ui-btn-venom-split ${extra}`, size)
}
