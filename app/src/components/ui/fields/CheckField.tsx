import type { ReactNode } from 'react'

type Props = { label: ReactNode; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; className?: string; 'aria-label'?: string }

/** A checkbox with its label */
export default function CheckField({ label, checked, onChange, disabled, className = '', ...rest }: Props) {
  return (
    <label className={`flex items-center gap-2 text-body ${disabled ? 'opacity-50' : 'cursor-pointer'} ${className}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={rest['aria-label']} className="size-4 shrink-0 cursor-pointer accent-(--accent)" />
      {label}
    </label>
  )
}
