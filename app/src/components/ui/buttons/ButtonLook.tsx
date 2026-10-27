import type { ComponentProps, ReactNode } from 'react'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'
import ButtonContent from './ButtonContent'
import type { ButtonIcon } from '../icons/IconSlot'

type Props = Omit<ComponentProps<'div'>, 'className' | 'children'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ButtonIcon
  className?: string
  children?: ReactNode
}

/** Looks like Button but isn't one (nothing to click): a dragged label, a copy measured for its size */
export default function ButtonLook({ variant = 'primary', size, icon, className, children, ...rest }: Props) {
  return (
    <div className={buttonClass(variant, className, size)} {...rest}>
      <ButtonContent variant={variant} icon={icon}>
        {children}
      </ButtonContent>
    </div>
  )
}
