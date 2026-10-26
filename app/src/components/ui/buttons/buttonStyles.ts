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

/** Tight rows: a smaller button (.ui-btn-sm); lg: as tall as a text field, with a bigger icon and text (.ui-btn-lg) */
export type ButtonSize = 'md' | 'sm' | 'lg'

const SIZE: Record<ButtonSize, string> = { md: '', sm: 'ui-btn-sm', lg: 'ui-btn-lg' }

/** Class string of a button of this variant (`group/main`: icon animations follow its hover) */
export function buttonClass(variant: ButtonVariant, extra = '', size: ButtonSize = 'md') {
  return `group/main ui-btn ${LOOK[variant]} ${variant === 'selected' ? 'ui-btn-selected' : ''} ${SIZE[size]} ${extra}`
}

/** Class string of a square button with only an icon (IconButton): Shade without its white corner brackets (.ui-btn-plain) */
export function iconButtonClass(variant: ButtonVariant, extra = '', size: ButtonSize = 'md') {
  const plain = LOOK[variant] === 'ui-btn-shade' ? 'ui-btn-plain' : ''
  return buttonClass(variant, `ui-btn-square ${plain} ${extra}`, size)
}

/** Class string of a split button (SplitButton): a Venom button in two pieces */
export function splitButtonClass(extra = '', size?: ButtonSize) {
  return buttonClass('create', `ui-btn-venom-split ${extra}`, size)
}
