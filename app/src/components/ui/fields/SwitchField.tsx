import { useId, type ReactNode } from 'react'

type Props = {
  label: ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Between the label and the switch (e.g. a small "What it is" button) */
  children?: ReactNode
  className?: string
}

/**
 * A switch with its label at the start of the row and the switch at its end, what is given as children between them (an on / off setting; a
 * checkbox is for choosing among things). A native checkbox underneath (role switch), so the keyboard and screen readers work as for any checkbox
 */
export default function SwitchField({ label, checked, onChange, disabled, children, className = '' }: Props) {
  const id = useId()
  return (
    <div className={`flex items-center gap-2 text-body ${disabled ? 'opacity-50' : ''} ${className}`}>
      <label htmlFor={id} className={`min-w-0 flex-1 truncate ${disabled ? '' : 'cursor-pointer'}`}>
        {label}
      </label>
      {children}
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      {/* The track and its knob, drawn from the input's state (peer), at the end of the row */}
      <label
        htmlFor={id}
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-full bg-fill-strong transition-colors duration-200 motion-reduce:transition-none peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent after:absolute after:start-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-surface after:transition-transform after:duration-200 motion-reduce:after:transition-none peer-checked:after:translate-x-4 ${disabled ? '' : 'cursor-pointer'}`}
      />
    </div>
  )
}
