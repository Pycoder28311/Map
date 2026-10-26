import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type ButtonProps = Omit<ComponentProps<'button'>, 'className'> & { to?: undefined; className?: string }
type LinkProps = { to: string; className?: string; children: ReactNode }

/**
 * The simplest button: just small text, lighter while hovered (styles/buttons.css, .ui-btn-link). For quiet "Show all" kinds of
 * actions. `to`: a link to a page of this app; without it, a button (type="button" unless set).
 */
export default function LinkButton(props: ButtonProps | LinkProps) {
  if (props.to !== undefined) {
    const { to, className = '', children } = props
    return (
      <Link to={to} className={`ui-btn-link ${className}`}>
        {children}
      </Link>
    )
  }
  const { type = 'button', className = '', ...button } = props
  return <button type={type} className={`ui-btn-link ${className}`} {...button} />
}
