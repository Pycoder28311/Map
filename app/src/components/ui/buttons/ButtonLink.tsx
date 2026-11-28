import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass, type ButtonSize, type ButtonTone, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = {
  variant?: ButtonVariant
  /** A primary button's colour (green, gray, red) */
  tone?: ButtonTone
  size?: ButtonSize
  icon?: ButtonIcon
  iconRight?: ButtonIcon
  iconAnimation?: IconAnimation
  className?: string
  children: ReactNode
} & ({ to: string; href?: never } | { href: string; to?: never })

/** A link that looks like Button: `to` for pages of this app, `href` for other sites and files */
export default function ButtonLink({ variant = 'primary', tone = 'green', size, icon, iconRight, iconAnimation, className, children, to, href }: Props) {
  const classes = buttonClass(variant, tone, className ?? '', size)
  const content = (
    <ButtonContent icon={icon} iconRight={iconRight} iconAnimation={iconAnimation}>
      {children}
    </ButtonContent>
  )
  if (to !== undefined) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }
  return (
    <a href={href} className={classes}>
      {content}
    </a>
  )
}
