import { useId, useState } from 'react'
import { LuPaintbrush } from 'react-icons/lu'
import IconButton from '../buttons/IconButton'
import type { PlainIcon } from '../icons/IconSlot'
import ColourPicker from './ColourPicker'

type Props = {
  label: string
  value: string
  onLive: (value: string) => void
  onCommit: (value: string) => void
  className?: string
  /** The colour the icon or letter shows when it is not `value` (what the selected text really looks like, e.g. its own colour when `value` is where the picker starts); left out: `value` */
  shown?: string
  /** Only the swatch, filling the height it is given and without its own corners or border (to sit inside a joined control); the label is its accessible name */
  bare?: boolean
  /** A wide swatch instead of a square one, as wide as the width given by `className` (and, like `bare`, without the visible label) */
  wide?: boolean
  /** A square button of a DropdownField (the arrow beside it) instead of the swatch: the icon with a bar of the colour under it; the label is its name */
  icon?: PlainIcon
  /** With `icon`'s kind of button: a letter (as a square button of a DropdownField, the arrow beside it) drawn in the colour with a small paintbrush (in the colour too) at its lower right, instead of the icon and its bar (a text colour: a coloured capital A that is being painted) */
  letter?: string
}

// The picker opens by the swatch: a native popover (top layer: never cut by the sidebar's scroll area; closes on a click outside or Esc).
// UA defaults reset (inset, margin, overflow); left/top are set when it opens
const PANEL = 'inset-auto m-0 overflow-visible rounded-(--card-radius) border border-line bg-surface p-3 text-fg shadow-xl'
/** The picker never starts closer than this to the window's edge (px) */
const EDGE = 8
/** The gap between the swatch and the picker (px) */
const GAP = 6

/** A labelled colour input: live while the picker moves, committed once when it is let go. Its picker opens next to the swatch */
export default function ColourField({ label, value, onLive, onCommit, className = '', shown, bare, wide, icon: Icon, letter }: Props) {
  const id = useId()
  // The colour while the picker moves; null: the saved one
  const [held, setHeld] = useState<string | null>(null)
  // Only the swatch shows; the label is its accessible name
  const hidden = bare || wide || Icon !== undefined || letter !== undefined
  // What the icon and the letter are drawn in: the picker's colour while it moves, else what the text shows
  const drawn = held ?? shown ?? value

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
      {letter !== undefined ? (
        <IconButton label={label} size="sm" popoverTarget={id} data-colour-anchor={id} aria-haspopup="dialog" onMouseDown={(e) => e.preventDefault()} className="ui-dropfield-icon">
          {/* One icon of painting a colour: the letter in the colour, a small paintbrush at its lower right, in the colour too */}
          <span aria-hidden className="relative flex">
            <span className="text-[1.25rem] leading-none font-bold" style={{ color: drawn }}>
              {letter}
            </span>
            <LuPaintbrush className="absolute -end-1.5 -bottom-1 size-3 stroke-[2.5]" style={{ color: drawn }} />
          </span>
        </IconButton>
      ) : Icon ? (
        <IconButton label={label} size="sm" popoverTarget={id} data-colour-anchor={id} aria-haspopup="dialog" onMouseDown={(e) => e.preventDefault()} className="ui-dropfield-icon">
          {/* The colour's bar is drawn over the icon's lower edge, so the button is as big as an icon button without one */}
          <span className="relative flex">
            <Icon className="size-(--btn-icon-size)" />
            <span aria-hidden className="absolute inset-x-0.5 -bottom-px h-[3px] rounded-full" style={{ backgroundColor: drawn }} />
          </span>
        </IconButton>
      ) : (
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
          <span className="block size-full rounded-(--corner-xs)" style={{ backgroundColor: held ?? value }} />
        </button>
      )}
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
