import { useId, useState } from 'react'
import ColourPicker from './ColourPicker'

type Props = {
  label: string
  value: string
  onLive: (value: string) => void
  onCommit: (value: string) => void
  className?: string
  /** Only the swatch, filling the height it is given and without its own corners or border (to sit inside a joined control); the label is its accessible name */
  bare?: boolean
  /** A wide swatch instead of a square one, as wide as the width given by `className` (and, like `bare`, without the visible label) */
  wide?: boolean
}

// The picker opens by the swatch: a native popover (top layer: never cut by the sidebar's scroll area; closes on a click outside or Esc).
// UA defaults reset (inset, margin, overflow); left/top are set when it opens
const PANEL = 'inset-auto m-0 overflow-visible rounded-(--card-radius) border border-line bg-surface p-3 text-fg shadow-xl'
/** The picker never starts closer than this to the window's edge (px) */
const EDGE = 8
/** The gap between the swatch and the picker (px) */
const GAP = 6

/** A labelled colour input: live while the picker moves, committed once when it is let go. Its picker opens next to the swatch */
export default function ColourField({ label, value, onLive, onCommit, className = '', bare, wide }: Props) {
  const id = useId()
  // The colour while the picker moves; null: the saved one
  const [held, setHeld] = useState<string | null>(null)
  // Only the swatch shows; the label is its accessible name
  const hidden = bare || wide

  // Placed before it shows: under the swatch, or above it when there is no room, kept inside the window
  const place = (e: React.ToggleEvent<HTMLDivElement>) => {
    if (e.newState !== 'open') return
    const panel = e.currentTarget
    const anchor = document.querySelector<HTMLElement>(`[data-colour-anchor="${CSS.escape(id)}"]`)
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    const width = panel.offsetWidth || 256
    const height = panel.offsetHeight || 340
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - width - EDGE)
    const below = r.bottom + GAP
    const top = below + height + EDGE <= window.innerHeight ? below : Math.max(EDGE, r.top - GAP - height)
    panel.style.left = `${left}px`
    panel.style.top = `${top}px`
  }

  return (
    <div className={`flex items-center ${bare ? 'h-full' : 'gap-3'} ${className}`}>
      <button
        type="button"
        popoverTarget={id}
        data-colour-anchor={id}
        aria-label={hidden ? label : undefined}
        aria-haspopup="dialog"
        // The text being edited keeps its selection while the picker is used
        onMouseDown={(e) => e.preventDefault()}
        className={
          bare
            ? 'h-full w-6 cursor-pointer border-0 bg-transparent p-0.5'
            : `${wide ? 'h-9 w-full' : 'size-9'} cursor-pointer rounded-(--btn-close-radius) border border-line bg-transparent p-0.5`
        }
      >
        <span className="block size-full rounded-[3px]" style={{ backgroundColor: held ?? value }} />
      </button>
      <div id={id} popover="auto" role="dialog" aria-label={`${label} picker`} onBeforeToggle={place} onToggle={(e) => e.newState === 'closed' && setHeld(null)} className={PANEL}>
        <ColourPicker
          key={value}
          value={value}
          onLive={(hex) => {
            setHeld(hex)
            onLive(hex)
          }}
          onCommit={(hex) => {
            setHeld(null)
            onCommit(hex)
          }}
        />
      </div>
      {!hidden && <span className="text-small text-fg-muted">{label}</span>}
    </div>
  )
}
