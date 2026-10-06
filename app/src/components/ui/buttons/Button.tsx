import type { ButtonHTMLAttributes } from 'react'
import { buttonClass, type ButtonVariant } from './buttonStyles'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
}

/** Themed button. type="button" unless set, so only the intended button submits a form. For links: ButtonLink */
export default function Button({
  variant = 'primary',
  icon,
  iconAnimation,
  type = 'button',
  className,
  children,
  ...button
}: Props) {
  return (
    <button type={type} className={buttonClass(variant, !!icon, className)} {...button}>
      {icon && <IconSlot icon={icon} animation={iconAnimation} />}
      {children}
    </button>
  )
}
