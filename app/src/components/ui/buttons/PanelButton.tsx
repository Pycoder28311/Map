import type { ComponentProps } from 'react'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'

type Props = ComponentProps<'button'> & {
  icon?: ButtonIcon
  /** The grey face (the ✕ Cancel side of the floating Create button) */
  muted?: boolean
}

/**
 * The big Panel button (gold double frame, Jacquard font). Only for the floating Create button
 * (features/create/CreateFab.tsx): buttons.test.ts fails if anything else uses it.
 */
export default function PanelButton({ icon, muted, type = 'button', className = '', children, ...button }: Props) {
  return (
    <button type={type} className={`ui-btn ui-btn-panel ${muted ? 'ui-btn-panel-muted' : ''} ${className}`} {...button}>
      {icon && <IconSlot icon={icon} className="ui-btn-icon" />}
      {children}
    </button>
  )
}
