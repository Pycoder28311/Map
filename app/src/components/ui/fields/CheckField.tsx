import type { ReactNode } from 'react'

type Props = {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
  /** Which end of the row the box is at: the start (default), or the end, the label taking the room before it (a list of rows) */
  boxAt?: 'start' | 'end'
}

/** A checkbox with its label */
export default function CheckField({ label, checked, onChange, disabled, className = '', boxAt = 'start', ...rest }: Props) {
  const box = (
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={rest['aria-label']} className="size-4 shrink-0 cursor-pointer accent-(--accent)" />
  )
  return (
    <label className={`flex items-center gap-2 text-body ${disabled ? 'opacity-50' : 'cursor-pointer'} ${className}`}>
      {boxAt === 'start' && box}
      {boxAt === 'end' ? <span className="flex min-w-0 flex-1 items-center">{label}</span> : label}
      {boxAt === 'end' && box}
    </label>
  )
}
