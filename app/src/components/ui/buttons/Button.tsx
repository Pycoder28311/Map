import type { ComponentProps } from 'react'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  /** Shade without its white corner brackets (.ui-btn-plain): the navbar's Recent History */
  plain?: boolean
  /** Shade with its background showing all the time, not only on hover (a Cancel beside a Create) */
  filled?: boolean
  /** Venom in red: an action that destroys something (Delete) */
  danger?: boolean
}

/** Themed button. type="button" unless set, so only the intended button submits a form. For links: ButtonLink */
export default function Button({
  variant = 'primary',
  size,
  icon,
  iconAnimation,
  plain,
  filled,
  danger,
  type = 'button',
  className,
  children,
  ...button
}: Props) {
  return (
    <button type={type} className={buttonClass(variant, `${plain ? 'ui-btn-plain' : ''} ${filled ? 'ui-btn-filled' : ''} ${danger ? 'ui-btn-danger' : ''} ${className ?? ''}`, size)} {...button}>
      <ButtonContent variant={variant} icon={icon} iconAnimation={iconAnimation}>
        {children}
      </ButtonContent>
    </button>
  )
}
