import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  className?: string
  children: ReactNode
} & ({ to: string; href?: never } | { href: string; to?: never })

/** A link that looks like Button: `to` for pages of this app, `href` for other sites and files */
export default function ButtonLink({ variant = 'primary', size, icon, iconAnimation, className, children, to, href }: Props) {
  const classes = buttonClass(variant, className, size)
  const content = (
    <ButtonContent variant={variant} icon={icon} iconAnimation={iconAnimation}>
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
