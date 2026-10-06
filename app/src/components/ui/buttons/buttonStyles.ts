// Shared by Button (<button>), ButtonLink (<Link> / <a>) and NavButton (<NavLink>), so links that
// look like buttons match exactly. Full class strings so Tailwind can detect them at build time.

const VARIANTS = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'bg-fill hover:bg-fill-strong',
  ghost: 'hover:bg-fill',
} as const

/** Look of the current page's link (NavButton) */
const ACTIVE = {
  primary: 'bg-accent-hover',
  secondary: 'bg-fill-strong',
  ghost: 'bg-fill',
} as const

export type ButtonVariant = keyof typeof VARIANTS

const BASE =
  'group/main inline-flex items-center justify-center gap-(--btn-gap) rounded-(--btn-radius) py-(--pill-py) ' +
  'text-body cursor-pointer transition-colors duration-200 ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const ICON_BASE =
  'inline-flex shrink-0 items-center justify-center p-(--btn-close-p) rounded-(--btn-close-radius) ' +
  'cursor-pointer transition-colors duration-200 ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

/** Small rounded background behind an icon, only while the pointer is on the icon itself (the theme's X, tree arrows) */
export const ICON_HOVER =
  'inline-flex shrink-0 p-(--btn-close-p) rounded-(--btn-close-radius) transition-colors duration-200 ease-out hover:bg-fg/10'

/** Class string of a square icon-only button (IconButton), same colours as the variants above */
export function iconButtonClass(variant: ButtonVariant, extra = '') {
  return `${ICON_BASE} ${VARIANTS[variant]} ${extra}`
}

/** Class string of a themed button; with an icon the start padding is the theme's tighter one */
export function buttonClass(variant: ButtonVariant, hasIcon: boolean, extra = '', active = false) {
  const padding = hasIcon ? 'ps-(--btn-px) pe-(--pill-px)' : 'px-(--pill-px)'
  return `${BASE} ${padding} ${VARIANTS[variant]} ${active ? ACTIVE[variant] : ''} ${extra}`
}
