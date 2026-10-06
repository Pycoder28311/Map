import type { ButtonHTMLAttributes } from 'react'
import { iconButtonClass, type ButtonVariant } from './buttonStyles'
import type { PlainIcon } from './IconSlot'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: PlainIcon
  /** Required: screen-reader name and tooltip, since there is no visible text */
  label: string
  variant?: ButtonVariant
}

/** Square button with only an icon, e.g. the panel header actions */
export default function IconButton({ icon: Icon, label, variant = 'ghost', type = 'button', className, ...button }: Props) {
  return (
    <button type={type} aria-label={label} title={label} className={iconButtonClass(variant, className)} {...button}>
      <Icon className="size-(--btn-icon-size)" />
    </button>
  )
}
