import type { ComponentProps, ReactNode } from 'react'
import { iconButtonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'
import { ICON_EFFECT_GROUP, iconEffectClass, type IconEffects } from '../icons/iconEffects'
import type { PlainIcon } from '../icons/IconSlot'

type Props = Omit<ComponentProps<'button'>, 'children'> & IconEffects & {
  /** Required: screen-reader name and tooltip, since there is no visible text */
  label: string
  variant?: ButtonVariant
  size?: ButtonSize
  /** A brighter icon (near white) with no background: the navbar's menu button */
  bright?: boolean
  /** A bigger icon in a button as tall as a normal one (the navbar's zoom button) */
  bigIcon?: boolean
  /** A circle floating over a border, with a line and a shadow (.ui-btn-round: the article's tools on its body's left edge) */
  round?: boolean
} & (
    | { icon: PlainIcon; /** Extra classes of the icon (e.g. its own animation) */ iconClassName?: string; children?: never }
    /** An icon of its own (e.g. one that changes with a state): sized by the button */
    | { icon?: never; iconClassName?: never; children: ReactNode }
  )

/** Square button with only an icon, e.g. the panel actions. Hover/click effects: on unless turned off */
export default function IconButton({
  icon: Icon,
  iconClassName = '',
  label,
  variant = 'ghost',
  size,
  bright,
  bigIcon,
  round,
  type = 'button',
  className = '',
  hoverEffect,
  clickEffect,
  children,
  ...button
}: Props) {
  const icon = Icon ? <Icon className={`${iconEffectClass({ hoverEffect, clickEffect })} ${iconClassName}`} /> : children
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={iconButtonClass(variant, `${ICON_EFFECT_GROUP} ${bright ? 'ui-btn-bright' : ''} ${bigIcon ? 'ui-btn-big-icon' : ''} ${round ? 'ui-btn-round' : ''} ${className}`, size)}
      {...button}
    >
      {variant === 'secondary' ? <span className="ui-btn-stone-face">{icon}</span> : icon}
    </button>
  )
}
