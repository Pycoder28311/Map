import type { InputHTMLAttributes } from 'react'
import { LuSearch } from 'react-icons/lu'
import { FIELD_INPUT, FIELD_VARIANTS, type FieldVariant } from './fieldStyles'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Screen-reader name, also the placeholder unless one is given */
  label?: string
  variant?: FieldVariant
}

/** Search field with a magnifier icon; `shadow` (floating) or `border` (outlined). Size it with className (e.g. w-64) */
export default function SearchInput({ label = 'Search', variant = 'shadow', className = '', placeholder, ...input }: Props) {
  return (
    <label className={`${FIELD_VARIANTS[variant]} ${className}`}>
      <LuSearch className="size-4 shrink-0 text-gray-500" />
      <input type="search" aria-label={label} placeholder={placeholder ?? label} className={FIELD_INPUT} {...input} />
    </label>
  )
}
