import type { InputHTMLAttributes, Ref } from 'react'
import { LuSearch } from 'react-icons/lu'
import { FIELD_BOX, FIELD_INPUT } from './fieldStyles'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Screen-reader name, also the placeholder unless one is given */
  label?: string
  /** The input element (e.g. to focus it from a shortcut) */
  ref?: Ref<HTMLInputElement>
}

/** Search field with a magnifier icon; size it with className (e.g. w-64) */
export default function SearchInput({ label = 'Search', className = '', placeholder, ...input }: Props) {
  return (
    <label className={`${FIELD_BOX} ${className}`}>
      <LuSearch className="size-4 shrink-0 text-fg-subtle" />
      <input type="search" aria-label={label} placeholder={placeholder ?? label} className={FIELD_INPUT} {...input} />
    </label>
  )
}
