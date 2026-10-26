import type { ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import Button from './Button'
import IconButton from './IconButton'
import type { ButtonIcon } from '../icons/IconSlot'
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

/** A button with an icon and a label, and an X button on its right (e.g. a list item or a tab) */
export default function ClosableButton({ icon, iconAnimation = 'none', children, onClick, onClose, closeLabel = 'Close' }: Props) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <Button variant="ghost" icon={icon} iconAnimation={iconAnimation} onClick={onClick} className="min-w-0 flex-1 justify-start">
        {children}
      </Button>
      <IconButton icon={LuX} label={closeLabel} onClick={onClose} />
    </div>
  )
}
