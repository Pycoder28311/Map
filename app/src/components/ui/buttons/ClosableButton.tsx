import type { ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import { ICON_HOVER } from './buttonStyles'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'
import type { IconAnimation } from '../icons/iconAnimations'

type Props = {
  icon?: ButtonIcon
  iconAnimation?: IconAnimation
  children: ReactNode
  onClick?: () => void
  onClose: () => void
  /** Screen-reader name of the X button */
  closeLabel?: string
}

/** Row button with an icon, a label and an X on the right (e.g. a list item or a tab). From the "Map buttons" theme */
export default function ClosableButton({ icon, iconAnimation = 'none', children, onClick, onClose, closeLabel = 'Close' }: Props) {
  return (
    <div className="flex flex-1 min-w-0 items-center gap-(--btn-gap) text-base rounded-(--btn-radius) cursor-pointer px-(--btn-px) py-(--btn-py) transition-colors duration-200 ease-out hover:bg-fill">
      <button type="button" onClick={onClick} className="group/main flex min-w-0 items-center gap-(--btn-gap) cursor-pointer">
        {icon && <IconSlot icon={icon} animation={iconAnimation} />}
        {children}
      </button>
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className={`ml-auto cursor-pointer ${ICON_HOVER}`}
      >
        <LuX className="size-(--btn-icon-size)" />
      </button>
    </div>
  )
}
