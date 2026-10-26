import type { ComponentProps, ReactNode } from 'react'
import { splitButtonClass, type ButtonSize } from './buttonStyles'

/** The two pieces of a split button (an icon piece and a label piece); also ExtendMenu's Create button */
export function SplitContent({
  icon,
  iconPosition = 'left',
  pieceClassName = '',
  children,
}: {
  icon: ReactNode
  iconPosition?: 'left' | 'right'
  /** Extra classes of both pieces (ExtendMenu, open: each piece a Shade button) */
  pieceClassName?: string
  children: ReactNode
}) {
  const iconPart = (
    <span className={`ui-btn-venom-split-icon ${pieceClassName}`} aria-hidden="true">
      {icon}
    </span>
  )
  const labelPart = <span className={`ui-btn-venom-split-label ${pieceClassName}`}>{children}</span>
  return iconPosition === 'right' ? (
    <>
      {labelPart}
      {iconPart}
    </>
  ) : (
    <>
      {iconPart}
      {labelPart}
    </>
  )
}

type Props = ComponentProps<'button'> & {
  /** The icon piece's content (e.g. <LuPlus />) */
  icon: ReactNode
  iconPosition?: 'left' | 'right'
  /** Extra classes of both pieces (see SplitContent) */
  pieceClassName?: string
  size?: ButtonSize
}

/** Venom button split in two: an icon piece and a label piece (the Create / Add buttons) */
export default function SplitButton({ icon, iconPosition, pieceClassName, size, type = 'button', className, children, ...button }: Props) {
  return (
    <button type={type} className={splitButtonClass(className, size)} {...button}>
      <SplitContent icon={icon} iconPosition={iconPosition} pieceClassName={pieceClassName}>
        {children}
      </SplitContent>
    </button>
  )
}
