// Small form fields of the panels. Numbers are whole units only: the field rounds what is typed and keeps it in its range.
import type { ReactNode } from 'react'

export function NumberField({ label, value, min, max, onChange, suffix, disabled }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string; disabled?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={1}
          disabled={disabled}
          onChange={(e) => {
            const v = Math.round(Number(e.target.value))
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)))
          }}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  )
}

export function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="field">
      <span>{label}</span>
      <span className="field-input">
        <input type="color" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        <code>{value}</code>
      </span>
    </label>
  )
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

/** A row of buttons of which one is chosen */
export function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; title?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="choice" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} title={o.title} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <header>
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  )
}
