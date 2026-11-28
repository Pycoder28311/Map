// The buttons' looks, in one place (the look itself is styles/buttons.css, section C). A button with text has ONE of these five
// styles and there are no others (buttons.test.ts checks it): no modifiers, no sixth style; a new look is a change to one of them.
// - primary: the framed button (the pixel frame, a panel, the pixel font) in one of three tones: green (the main action, the default), gray
//   (the other actions), red (an action that destroys something)
// - secondary: bold white pixel text; hovered, the frame comes out of the screen (Sort by)
// - underline: just its text; a line under it while hovered (the quiet actions: Show more, tabs not chosen…)
// - leather: a book card's Open
// - link: LinkButton (small text that lightens). Sizes change how big a button is, not its style.
// Buttons with only an icon (IconButton) keep their own looks: ICON_LOOK below.

const LOOK = {
  /** The framed button, in a tone */
  primary: 'ui-btn-primary',
  /** Bold white pixel text; hovered, the frame pulls out of the screen */
  secondary: 'ui-btn-secondary',
  /** Text only, a line under it while hovered */
  underline: 'ui-btn-underline',
  /** A book card's Open: light brown leather */
  leather: 'ui-btn-leather',
} as const

export type ButtonVariant = keyof typeof LOOK

/** A primary button's colour: green (the main action), gray (the other actions), red (destroys something) */
export type ButtonTone = 'green' | 'gray' | 'red'
const TONE: Record<ButtonTone, string> = { green: 'ui-tone-green', gray: '', red: 'ui-tone-red' }

/** Tight rows: a smaller button (.ui-btn-sm), xs smaller still (a map card's name); lg: as tall as a text field, with a bigger icon and text (.ui-btn-lg) */
export type ButtonSize = 'md' | 'sm' | 'xs' | 'lg'

const SIZE: Record<ButtonSize, string> = { md: '', sm: 'ui-btn-sm', xs: 'ui-btn-xs', lg: 'ui-btn-lg' }

/** Class string of a button with text (`group/main`: icon animations follow its hover) */
export function buttonClass(variant: ButtonVariant = 'primary', tone: ButtonTone = 'green', extra = '', size: ButtonSize = 'md') {
  return `group/main ui-btn ${LOOK[variant]} ${variant === 'primary' ? TONE[tone] : ''} ${SIZE[size]} ${extra}`
}

/** The looks of a button with only an icon (IconButton), as they were: Shade (no frame), Stone, Venom, Underline */
const ICON_LOOK = {
  /** Shade without its corner brackets: no background until hovered (the default) */
  ghost: 'ui-btn-shade ui-btn-plain',
  /** Shade kept in its hover look (the chosen one) */
  selected: 'ui-btn-shade ui-btn-plain ui-btn-selected',
  /** Stone: a gray block */
  secondary: 'ui-btn-stone',
  /** Venom: green */
  primary: 'ui-btn-venom',
  /** Underline as a square: the icon brightens */
  text: 'ui-btn-underline',
} as const

export type IconButtonVariant = keyof typeof ICON_LOOK

/** Class string of a square button with only an icon (IconButton) */
export function iconButtonClass(variant: IconButtonVariant, extra = '', size: ButtonSize = 'md') {
  return `group/main ui-btn ui-btn-square ${ICON_LOOK[variant]} ${SIZE[size]} ${extra}`
}
