import { useState, type ComponentProps } from 'react'

/** The input's sizes: its height and side padding, and the heading it grows to (Tailwind needs the full class strings) */
const SIZES = {
  sm: { box: 'h-8 px-3', big: 'text-base' },
  md: { box: 'h-10 px-3', big: 'text-base' },
  lg: { box: 'h-12 px-4', big: 'text-heading' },
  xl: { box: 'h-14 px-0', big: 'text-4xl' },
} as const

export type TitleSize = keyof typeof SIZES

type Props = Omit<ComponentProps<'input'>, 'size'> & {
  /** Its size: `lg` is the Dashboard's big input, `md` the modals', `xl` an article page's title */
  size?: TitleSize
}

/**
 * The title of a note-like input (the Dashboard's big input, the Create modals): body-sized while empty and unfocused, it grows
 * to a heading (smoothly) while the cursor is in it and once it has text.
 */
export default function TitleInput({ size = 'lg', className = '', value, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false)
  const big = focused || (value !== undefined && String(value) !== '')
  return (
    <input
      value={value}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      className={`w-full resize-none bg-transparent text-fg outline-none transition-[font-size,line-height] duration-200 ease-out placeholder:text-fg-subtle motion-reduce:transition-none ${SIZES[size].box} ${
        big ? `${SIZES[size].big} font-semibold` : 'text-body'
      } ${className}`}
      {...input}
    />
  )
}
