import { useState } from 'react'

// One border around a button or label and the field joined to it; the button's ends are square against the field
export const JOINED = 'flex items-stretch overflow-hidden rounded-(--btn-close-radius) border border-line-strong focus-within:border-fg-subtle'

/** A small whole-number input inside a joined element: the arrows apply at once, typing waits for Enter or leaving it */
export default function NumberBox({ value, min, max, label, onCommit }: { value: number; min: number; max: number; label: string; onCommit: (n: number) => void }) {
  const [typed, setTyped] = useState<string | null>(null)
  const commit = (text: string | null) => {
    const n = Math.round(Number(text))
    setTyped(null)
    if (text !== null && text !== '' && Number.isFinite(n) && n >= min && n <= max && n !== value) onCommit(n)
  }
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={typed ?? value}
      aria-label={label}
      onChange={(e) => {
        const inputType = (e.nativeEvent as InputEvent).inputType
        setTyped(e.target.value)
        // A scrub (numberScrub.ts) keeps the value until it ends; the arrows apply at once; typing waits for Enter or leaving
        if (!e.target.dataset.scrubbing && inputType !== 'insertText' && inputType !== 'deleteContentBackward') commit(e.target.value)
      }}
      onBlur={() => commit(typed)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="w-full min-w-0 flex-1 border-0 border-s border-line-strong bg-surface px-2 text-small tabular-nums outline-none"
    />
  )
}

/** A number input in a joined element with its name in front of it (a number instead of a slider); `hideLabel`: the name is only its accessible name */
export function NumberField({ label, suffix, className = '', hideLabel, ...box }: { label: string; suffix?: string; className?: string; hideLabel?: boolean; value: number; min: number; max: number; onCommit: (n: number) => void }) {
  return (
    <label className={`${JOINED} min-w-0 flex-1 ${className}`}>
      {!hideLabel && <span className="flex items-center px-2 text-small text-fg-muted">{label}</span>}
      <NumberBox {...box} label={label} />
      {suffix && <span className="flex items-center border-s border-line-strong px-1.5 text-small text-fg-muted">{suffix}</span>}
    </label>
  )
}
