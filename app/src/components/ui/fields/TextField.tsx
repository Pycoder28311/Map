import type { InputHTMLAttributes } from 'react'
import { FIELD_INPUT, FIELD_VARIANTS, type FieldVariant } from './fieldStyles'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; variant?: FieldVariant }

/** Labelled text input in the theme's field style */
export default function TextField({ label, variant = 'border', className = '', ...input }: Props) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-small text-fg-muted">{label}</span>
      <span className={FIELD_VARIANTS[variant]}>
        <input className={FIELD_INPUT} {...input} />
      </span>
    </label>
  )
}
