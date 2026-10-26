import type { ComponentProps, ElementType } from 'react'

type Props = ComponentProps<'div'> & {
  /** The element: a `label` around an input (default), or a `div` / `span` */
  as?: Extract<ElementType, 'label' | 'div' | 'span'>
  /** Laid out as one row: the field's height and padding, its content centred (SearchInput, TextField). Off: the box only, the caller lays it out (the Dashboard's big input) */
  row?: boolean
}

/**
 * The box of every input: the look is `.ui-field` (styles/fields.css: its colours, shadow, corners and border are set
 * there, once). SearchInput, TextField and the Dashboard's big input are all this; a new kind of input starts here too.
 */
export default function InputBox({ as: Tag = 'label', row = true, className = '', ...rest }: Props) {
  const Box = Tag as ElementType
  return <Box className={`ui-field ${row ? 'flex items-center gap-(--field-gap) h-(--field-h) px-(--field-px)' : ''} ${className}`} {...rest} />
}
