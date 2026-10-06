import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass, type ButtonVariant } from './buttonStyles'
import IconSlot, { type ButtonIcon } from './IconSlot'
import type { IconAnimation } from './iconAnimations'

type Props = {
  variant?: ButtonVariant
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  className?: string
  children: ReactNode
} & ({ to: string; href?: never } | { href: string; to?: never })

/** A link that looks like Button: `to` for pages of this app, `href` for other sites and files */
export default function ButtonLink({ variant = 'primary', icon, iconAnimation, className, children, to, href }: Props) {
  const classes = buttonClass(variant, !!icon, className)
  const content = (
    <>
      {icon && <IconSlot icon={icon} animation={iconAnimation} />}
      {children}
    </>
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
