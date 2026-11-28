import type { ComponentProps, ReactNode } from 'react'
import { buttonClass, type ButtonSize, type ButtonTone, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'

type Props = Omit<ComponentProps<'div'>, 'className' | 'children'> & {
  variant?: ButtonVariant
  /** A primary look's colour: gray by default (a name, not an action) */
  tone?: ButtonTone
  size?: ButtonSize
  icon?: ButtonIcon
  iconRight?: ButtonIcon
  className?: string
  children?: ReactNode
}

/** Looks like Button but isn't one (nothing to click): a dragged label, a card's name, a copy measured for its size */
export default function ButtonLook({ variant = 'primary', tone = 'gray', size, icon, iconRight, className, children, ...rest }: Props) {
  return (
    <div className={buttonClass(variant, tone, className ?? '', size)} {...rest}>
      <ButtonContent icon={icon} iconRight={iconRight}>
        {children}
      </ButtonContent>
    </div>
  )
}
