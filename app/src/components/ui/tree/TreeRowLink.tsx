import type { AnchorHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react'
import { NavLink } from 'react-router-dom'
import { SIDEBAR_ROW } from '../rowStyles'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'style' | 'children'> & {
  to: string
  className?: string
  style?: CSSProperties
  /** Overrides the route-based current state (e.g. "this panel is open") */
  active?: boolean
  ref?: Ref<HTMLAnchorElement>
  children: ReactNode
}

/** A tree row's link: a row, not a button (the theme's row look; the current page filled) */
export default function TreeRowLink({ to, className = '', style, active, children, ...link }: Props) {
  return (
    <NavLink
      {...link}
      to={to}
      style={style}
      aria-current={active === undefined ? undefined : active ? 'page' : false}
      className={`${SIDEBAR_ROW} ${className}`}
    >
      {children}
    </NavLink>
  )
}
