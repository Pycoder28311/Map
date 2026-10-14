import { useRef, useState } from 'react'
import { useCommitOnChange } from './useCommitOnChange'

type Props = { label: string; value: string; onLive: (value: string) => void; onCommit: (value: string) => void; className?: string }

/** A labelled colour input: live while the picker moves, committed once when it closes */
export default function ColourField({ label, value, onLive, onCommit, className = '' }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [held, setHeld] = useState<string | null>(null)
  useCommitOnChange(input, (v) => {
    setHeld(null)
    onCommit(v)
  })
  return (
    <label className={`flex items-center gap-3 ${className}`}>
      <input
        ref={input}
        type="color"
        value={held ?? value}
        onChange={(e) => {
          setHeld(e.target.value)
          onLive(e.target.value)
        }}
        className="size-9 cursor-pointer rounded-(--btn-close-radius) border border-line bg-transparent p-0.5"
      />
      <span className="text-small text-fg-muted">{label}</span>
    </label>
  )
}
