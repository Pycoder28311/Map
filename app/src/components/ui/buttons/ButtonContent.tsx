import type { ReactNode } from 'react'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'
import type { ButtonVariant } from './buttonStyles'

type Props = {
  variant: ButtonVariant
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  children?: ReactNode
}

/** What's inside Button, ButtonLink and NavButton: the icon, then the label; a Stone button has them on its face */
export default function ButtonContent({ variant, icon, iconAnimation, children }: Props) {
  const content = (
    <>
      {icon && <IconSlot icon={icon} animation={iconAnimation} className="ui-btn-icon" />}
      {children}
    </>
  )
  return variant === 'secondary' ? <span className="ui-btn-stone-face">{content}</span> : content
}
