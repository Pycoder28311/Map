import { useEffect, useRef } from 'react'
import { FLOAT } from './floating'

type Props = {
  /** Where the pointer rested (the editor's own pixels) */
  at: { x: number; y: number }
  onSave: (name: string) => void
  onClose: () => void
  /** The input has focus: keep it open however the pointer moves */
  onUse: (on: boolean) => void
}

/** The small input that offers a name to an area that has none: Enter saves it, Esc or leaving closes it */
export default function AreaNameInput({ at, onSave, onClose, onUse }: Props) {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => () => onUse(false), [onUse])
  return (
    <div style={{ left: at.x + 12, top: at.y + 12 }} className={`pointer-events-auto absolute z-10 p-1.5 ${FLOAT}`}>
      <input
        ref={input}
        aria-label="Name this area"
        placeholder="Name this area"
        onFocus={() => onUse(true)}
        onBlur={onClose}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            const name = e.currentTarget.value.trim()
            if (name) onSave(name)
            onClose()
          } else if (e.key === 'Escape') onClose()
        }}
        className="w-44 rounded-(--btn-close-radius) bg-fill px-2 py-1 text-body outline-none focus-visible:outline-2 focus-visible:outline-accent"
      />
    </div>
  )
}
