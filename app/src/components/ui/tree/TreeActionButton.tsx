import type { ButtonHTMLAttributes } from 'react'
import { ICON_HOVER } from '../buttons/buttonStyles'
import type { PlainIcon } from '../icons/IconSlot'

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: PlainIcon
  /** Required: screen-reader name and tooltip, since there is no visible text */
  label: string
}

/** Icon button shown on the right of a tree row while it's hovered; same hover background as the row's arrow */
export default function TreeActionButton({ icon: Icon, label, type = 'button', className = '', ...button }: Props) {
  return (
    <button type={type} aria-label={label} title={label} className={`cursor-pointer ${ICON_HOVER} ${className}`} {...button}>
      <Icon className="size-(--btn-icon-size)" />
    </button>
  )
}
