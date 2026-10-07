// Hover and click effects of a clickable icon: the icon grows a little while its button is hovered
// and shrinks while it's pressed. The button gets ICON_EFFECT_GROUP, the icon iconEffectClass().
// Sizes and speed: --icon-* in styles/tokens.css. Full class strings so Tailwind can detect them.

/** On/off per icon (both on when left out) */
export type IconEffects = {
  /** Grows while its button is hovered */
  hoverEffect?: boolean
  /** Shrinks while its button is pressed */
  clickEffect?: boolean
}

/** On the button (or link) the icon is in: the effects follow its hover and press */
export const ICON_EFFECT_GROUP = 'group/icon'

const BASE = 'transition-[scale] duration-(--icon-effect-duration) ease-out motion-reduce:transition-none'
const HOVER = 'group-hover/icon:scale-(--icon-hover-scale)'
const CLICK = 'group-active/icon:scale-(--icon-click-scale)'

/** Classes for the icon itself */
export function iconEffectClass({ hoverEffect = true, clickEffect = true }: IconEffects = {}) {
  if (!hoverEffect && !clickEffect) return ''
  return `${BASE} ${hoverEffect ? HOVER : ''} ${clickEffect ? CLICK : ''}`
}
