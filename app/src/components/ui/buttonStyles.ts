// Shared by Button (<button>), ButtonLink (<Link> / <a>) and NavButton (<NavLink>), so links that
// look like buttons match exactly. Full class strings so Tailwind can detect them at build time.

const VARIANTS = {
  primary: 'bg-gray-900 text-white hover:bg-gray-700',
  secondary: 'bg-gray-200 hover:bg-gray-300',
  ghost: 'hover:bg-gray-200',
} as const

/** Look of the current page's link (NavButton) */
const ACTIVE = {
  primary: 'bg-gray-700',
  secondary: 'bg-gray-300',
  ghost: 'bg-gray-200',
} as const

export type ButtonVariant = keyof typeof VARIANTS

const BASE =
  'group/main inline-flex items-center justify-center gap-(--btn-gap) rounded-(--btn-radius) py-(--pill-py) ' +
  'text-body cursor-pointer transition-colors duration-200 ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const ICON_BASE =
  'inline-flex shrink-0 items-center justify-center p-(--btn-close-p) rounded-(--btn-close-radius) ' +
  'cursor-pointer transition-colors duration-200 ease-out ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

/** Class string of a square icon-only button (IconButton), same colours as the variants above */
export function iconButtonClass(variant: ButtonVariant, extra = '') {
  return `${ICON_BASE} ${VARIANTS[variant]} ${extra}`
}

/** Class string of a themed button; with an icon the start padding is the theme's tighter one */
export function buttonClass(variant: ButtonVariant, hasIcon: boolean, extra = '', active = false) {
  const padding = hasIcon ? 'ps-(--btn-px) pe-(--pill-px)' : 'px-(--pill-px)'
  return `${BASE} ${padding} ${VARIANTS[variant]} ${active ? ACTIVE[variant] : ''} ${extra}`
}
