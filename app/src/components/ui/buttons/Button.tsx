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
}

/** Themed button. type="button" unless set, so only the intended button submits a form. For links: ButtonLink */
export default function Button({
  variant = 'primary',
  size,
  icon,
  iconAnimation,
  type = 'button',
  className,
  children,
  ...button
}: Props) {
  return (
    <button type={type} className={buttonClass(variant, className, size)} {...button}>
      <ButtonContent variant={variant} icon={icon} iconAnimation={iconAnimation}>
        {children}
      </ButtonContent>
    </button>
  )
}
