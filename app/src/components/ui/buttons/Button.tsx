import type { ComponentProps } from 'react'
import { buttonClass, type ButtonSize, type ButtonTone, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = ComponentProps<'button'> & {
  /** primary (framed, default), underline (text only) or leather */
  variant?: ButtonVariant
  /** A primary button's colour: green (default), gray, red */
  tone?: ButtonTone
  size?: ButtonSize
  /** An icon before the label, and / or one after it */
  icon?: ButtonIcon
  iconRight?: ButtonIcon
  iconAnimation?: IconAnimation
}

/** Themed button with text. type="button" unless set, so only the intended button submits a form. For links: ButtonLink; only an icon: IconButton */
export default function Button({ variant = 'primary', tone = 'green', size, icon, iconRight, iconAnimation, type = 'button', className, children, ...button }: Props) {
  return (
    <button type={type} className={buttonClass(variant, tone, className ?? '', size)} {...button}>
      <ButtonContent icon={icon} iconRight={iconRight} iconAnimation={iconAnimation}>
        {children}
      </ButtonContent>
    </button>
  )
}
