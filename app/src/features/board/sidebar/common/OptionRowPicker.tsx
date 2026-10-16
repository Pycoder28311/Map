import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { LuChevronDown } from 'react-icons/lu'

/** `sample` is given the width the example has to fill (it stretches over the row) */
export type RowOption<T extends string | number> = { value: T; label: string; sample: (width: number) => ReactNode }

type Props<T extends string | number> = {
  /** What it picks, for screen readers */
  label: string
  value: T
  options: RowOption<T>[]
  onChange: (value: T) => void
}

/** What fills the room a row leaves for the example: it is drawn as wide as that room, and again when the room changes */
function Stretch({ draw }: { draw: (width: number) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(96)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => setWidth(Math.max(40, Math.floor(el.clientWidth)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={box} className="min-w-0 flex-1">
      {draw(width)}
    </div>
  )
}

const ROW = 'flex w-full items-center gap-3 rounded-(--field-radius) border px-2 py-1 text-start transition-colors'

/**
 * One whole row is the picked option (its example and its name) with an arrow at its right that opens the others,
 * one row each, in front of what is under them (nothing moves).
 */
export default function OptionRowPicker<T extends string | number>({ label, value, options, onChange }: Props<T>) {
  const [open, setOpen] = useState(false)
  const list = useId()
  const current = options.find((o) => o.value === value) ?? options[0]
  return (
    <div
      className="relative"
      // Leaving the row and its list (a click elsewhere, Tab) closes it
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          setOpen(false)
        }
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={list}
        onClick={() => setOpen((on) => !on)}
        className={`${ROW} cursor-pointer border-line py-0! pe-0! hover:bg-fill`}
      >
        <span className="flex min-w-0 flex-1 items-center gap-3 py-1">
          <Stretch draw={current.sample} />
          <span className="shrink-0 text-small text-fg-muted">{current.label}</span>
        </span>
        {/* The arrow has a cell of its own, set off from the row by a line */}
        <span className="flex items-center self-stretch border-s border-line-strong px-2.5">
          <LuChevronDown className={`size-4 shrink-0 text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </span>
      </button>
      {open && (
        <ul id={list} role="listbox" aria-label={label} className="absolute inset-x-0 top-full z-30 mt-1 flex max-h-80 flex-col gap-1 overflow-y-auto rounded-(--menu-radius) border border-line bg-surface p-1.5 shadow-lg">
          {options.map((o) => (
            <li key={o.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`${ROW} cursor-pointer ${o.value === value ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-fill'}`}
              >
                <Stretch draw={o.sample} />
                <span className="shrink-0 text-small text-fg-muted">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
