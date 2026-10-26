import type { InputHTMLAttributes } from 'react'
import { FIELD_INPUT } from './fieldStyles'
import InputBox from './InputBox'

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string }

/** Labelled text input in the field style (styles/fields.css) */
export default function TextField({ label, className = '', ...input }: Props) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-small text-fg-muted">{label}</span>
      <InputBox as="span">
        <input className={FIELD_INPUT} {...input} />
      </InputBox>
    </label>
  )
}
