import type { AnchorHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react'
import { NavLink } from 'react-router-dom'
import { buttonClass, type ButtonVariant } from './buttonStyles'
import IconSlot, { type ButtonIcon } from './IconSlot'
import type { IconAnimation } from './iconAnimations'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'style' | 'children'> & {
  to: string
  variant?: ButtonVariant
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  className?: string
  style?: CSSProperties
  /** Active only on this exact path, not on its sub-pages */
  end?: boolean
  /** Overrides the route-based active state (e.g. "this panel is open") */
  active?: boolean
  ref?: Ref<HTMLAnchorElement>
  children: ReactNode
}

/** Navigation link that looks like Button and marks the current page (aria-current="page" + active style) */
export default function NavButton({
  to,
  variant = 'ghost',
  icon,
  iconAnimation,
  className,
  style,
  end,
  active,
  children,
  ...link
}: Props) {
  return (
    <NavLink
      {...link}
      to={to}
      end={end}
      style={style}
      aria-current={active === undefined ? undefined : active ? 'page' : false}
      className={({ isActive }) => buttonClass(variant, !!icon, className, active ?? isActive)}
    >
      {icon && <IconSlot icon={icon} animation={iconAnimation} />}
      {children}
    </NavLink>
  )
}
