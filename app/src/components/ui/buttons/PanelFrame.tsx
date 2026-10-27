import type { ReactNode, Ref } from 'react'
import IconSlot, { type ButtonIcon } from '../icons/IconSlot'

type Props = {
  /** Open: the frame holds `children` (the caller sizes the frame); closed: it is a button saying `label` */
  open: boolean
  icon?: ButtonIcon
  label: string
  /** Pressing the closed button */
  onPress: () => void
  buttonRef?: Ref<HTMLButtonElement>
  /** The id of what the button opens */
  controls?: string
  /** What the open frame holds. Stays mounted while it fades out (the caller unmounts it when it's gone) */
  children?: ReactNode
  className?: string
}

/**
 * The big Panel button (gold double frame, stepped corners, hard drop shadow, Jacquard font) that grows into what it opens: the
 * floating Create button, whose frame expands to the modal (features/create/CreateFab.tsx) and shrinks back to the button. It fills
 * the box its caller sizes. Only for that: buttons.test.ts fails if anything else uses it.
 */
export default function PanelFrame({ open, icon, label, onPress, buttonRef, controls, children, className = '' }: Props) {
  return (
    <div className={`ui-btn ui-btn-panel relative cursor-auto p-0 active:transform-none ${className}`}>
      {/* Closed: the label, over the whole frame. It fades out as the frame grows, and back in once it has shrunk */}
      <button
        ref={buttonRef}
        type="button"
        onClick={onPress}
        tabIndex={open ? -1 : 0}
        aria-hidden={open}
        aria-expanded={open}
        aria-controls={controls}
        className={`absolute inset-0 flex cursor-pointer items-center justify-center gap-3 transition-opacity duration-150 motion-reduce:transition-none ${
          open ? 'pointer-events-none opacity-0' : 'opacity-100 delay-200'
        }`}
      >
        {icon && <IconSlot icon={icon} className="size-6 shrink-0" />}
        {label}
      </button>
      {/* Open: inside the frame, in the body font (the frame's own font and text shadow are for its label) */}
      <div
        style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, letterSpacing: 'normal', textShadow: 'none', lineHeight: 'normal' }}
        className={`absolute inset-1.5 overflow-hidden bg-surface text-start text-fg transition-opacity motion-reduce:transition-none ${
          open ? 'opacity-100 delay-150 duration-200' : 'pointer-events-none opacity-0 duration-150'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
