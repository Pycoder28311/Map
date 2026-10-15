import { useRef, useState } from 'react'
import { useCommitOnChange } from './useCommitOnChange'

type Props = {
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** Said after the number (px, %, °) */
  suffix?: string
  /** While the slider moves */
  onLive: (value: number) => void
  /** When it is let go: one change */
  onCommit: (value: number) => void
  className?: string
  /** The label is only for screen readers (the section it is in already says what it is) */
  hideLabel?: boolean
  /** The number is not shown (the slider alone) */
  hideValue?: boolean
}

/** A labelled slider that shows its value: live while dragged, committed once on release */
export default function RangeField({ label, value, min, max, step = 1, suffix = '', onLive, onCommit, className = '', hideLabel, hideValue }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [held, setHeld] = useState<number | null>(null)
  useCommitOnChange(input, (v) => {
    setHeld(null)
    onCommit(Number(v))
  })
  const shown = held ?? value
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className={hideLabel && hideValue ? 'sr-only' : `flex text-small text-fg-muted ${hideLabel ? 'justify-end' : 'justify-between'}`}>
        <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
        {!hideValue && (
          <span className="tabular-nums">
            {shown}
            {suffix}
          </span>
        )}
      </span>
      <input
        ref={input}
        type="range"
        min={min}
        max={max}
        step={step}
        value={shown}
        onChange={(e) => {
          setHeld(Number(e.target.value))
          onLive(Number(e.target.value))
        }}
        className="h-4 w-full cursor-pointer accent-(--accent)"
      />
    </label>
  )
}
