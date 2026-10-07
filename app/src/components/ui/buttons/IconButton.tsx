import type { ComponentProps } from 'react'
import { iconButtonClass, type ButtonVariant } from './buttonStyles'
import { ICON_EFFECT_GROUP, iconEffectClass, type IconEffects } from '../icons/iconEffects'
import type { PlainIcon } from '../icons/IconSlot'

type Props = Omit<ComponentProps<'button'>, 'children'> & IconEffects & {
  icon: PlainIcon
  /** Required: screen-reader name and tooltip, since there is no visible text */
  label: string
  variant?: ButtonVariant
}

/** Square button with only an icon, e.g. the panel actions. Hover/click effects: on unless turned off */
export default function IconButton({
  icon: Icon,
  label,
  variant = 'ghost',
  type = 'button',
  className = '',
  hoverEffect,
  clickEffect,
  ...button
}: Props) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={iconButtonClass(variant, `${ICON_EFFECT_GROUP} ${className}`)}
      {...button}
    >
      <Icon className={`size-(--btn-icon-size) ${iconEffectClass({ hoverEffect, clickEffect })}`} />
    </button>
  )
}
