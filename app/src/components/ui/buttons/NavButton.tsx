import type { AnchorHTMLAttributes, CSSProperties, ReactNode, Ref } from 'react'
import { NavLink } from 'react-router-dom'
import { buttonClass, type ButtonSize, type ButtonTone, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'style' | 'children'> & {
  to: string
  variant?: ButtonVariant
  /** A primary button's colour (green, gray, red) */
  tone?: ButtonTone
  size?: ButtonSize
  icon?: ButtonIcon
  iconRight?: ButtonIcon
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

/** Navigation link that looks like Button (primary gray by default) and marks the current page (aria-current="page": styles/buttons.css gives it the hover look) */
export default function NavButton({
  to,
  variant = 'primary',
  tone = 'gray',
  size,
  icon,
  iconRight,
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
      className={buttonClass(variant, tone, className ?? '', size)}
    >
      <ButtonContent icon={icon} iconRight={iconRight} iconAnimation={iconAnimation}>
        {children}
      </ButtonContent>
    </NavLink>
  )
}
