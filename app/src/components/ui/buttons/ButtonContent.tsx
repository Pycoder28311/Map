import type { ReactNode } from 'react'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = {
  /** An icon before the label, and / or one after it */
  icon?: ButtonIcon
  iconRight?: ButtonIcon
  iconAnimation?: IconAnimation
  children?: ReactNode
}

/** What's inside Button, ButtonLink, NavButton and ButtonLook: an icon, the label, an icon */
export default function ButtonContent({ icon, iconRight, iconAnimation, children }: Props) {
  return (
    <>
      {icon && <IconSlot icon={icon} animation={iconAnimation} className="ui-btn-icon" />}
      {children}
      {iconRight && <IconSlot icon={iconRight} animation={iconAnimation} className="ui-btn-icon ui-btn-icon-right" />}
    </>
  )
}
