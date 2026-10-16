import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { LuChevronsLeftRight, LuRotateCcw } from 'react-icons/lu'
import { useCommitOnChange } from './useCommitOnChange'

/** How many px of sideways movement change the value by one step */
const SCRUB_PX = 2
/** How far (px) the pointer must move on the number before a press is a scrub rather than a click */
const CLICK_PX = 3

type Props = {
  /** What it sets: the small title at the bar's top left */
  label: string
  value: number
  min: number
  max: number
  step?: number
  /** Said after the number (px, %, °) */
  suffix?: string
  /** What the turn-back icon returns to */
  defaultValue: number
  /** The common values offered in the little modal, in reading order */
  presets: number[]
  /** The modal's grid: `columns` across and `rows` down (the presets that do not fit are left out) */
  grid: { rows: number; columns: number }
  /** While the slider or the number is held: preview it */
  onLive: (value: number) => void
  /** When it is let go, typed or chosen: one change */
  onCommit: (value: number) => void
  className?: string
  /** The label is only for screen readers (the section it is in already says what it is) */
  hideLabel?: boolean
}

/** `count` values spread evenly from `min` to `max` (whole numbers, none twice): handy for the modal's presets */
export function spreadPresets(min: number, max: number, count = 6): number[] {
  return [...new Set(Array.from({ length: count }, (_, i) => Math.round(min + ((max - min) * i) / (count - 1))))]
}

/**
 * A slider with its number at the top right, the whole system in one piece:
 *  - hold the mouse on the number (the double arrow) and move sideways to change it, live;
 *  - click the number: a modal in front of it (nothing moves) with an input and the common values in a grid;
 *  - the turn-back icon puts the value back to its default.
 * The two icons are always there. Live while dragged, committed once on release.
 */
export default function ValueBar({ label, value, min, max, step = 1, suffix = '', defaultValue, presets, grid, onLive, onCommit, className = '', hideLabel }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [held, setHeld] = useState<number | null>(null)
  // The number turned into the modal's input (what is typed so far)
  const [draft, setDraft] = useState<string | null>(null)
  useCommitOnChange(input, (v) => {
    setHeld(null)
    onCommit(Number(v))
  })
  const shown = held ?? value
  const fraction = max > min ? (shown - min) / (max - min) : 0
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)))
  // A scrub that ends outside the number is still followed by a click on the label, which would pass it on to the slider (and save the value it had)
  const scrubbed = useRef(false)
  const swallowClick = () => {
    scrubbed.current = true
    setTimeout(() => (scrubbed.current = false), 0)
  }
  // Holding the mouse on the number and moving sideways: one value per SCRUB_PX, live while held, one change when let go.
  // A press that does not move is a click: the modal opens
  const scrub = (down: PointerEvent<HTMLElement>) => {
    if (down.button !== 0) return
    down.preventDefault()
    const x0 = down.clientX
    const start = shown
    let last = start
    let moved = false
    const move = (e: globalThis.PointerEvent) => {
      if (!moved && Math.abs(e.clientX - x0) < CLICK_PX) return
      if (!moved) {
        moved = true
        document.documentElement.style.cursor = 'ew-resize'
        document.documentElement.style.userSelect = 'none'
      }
      const next = clamp(start + Math.trunc((e.clientX - x0) / SCRUB_PX) * step)
      if (next === last) return
      last = next
      setHeld(next)
      onLive(next)
    }
    const end = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      document.documentElement.style.cursor = ''
      document.documentElement.style.userSelect = ''
      setHeld(null)
      swallowClick()
      if (last !== start) onCommit(last)
      else if (!moved) setDraft(String(start))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }
  // Leaves the modal: the typed (or chosen) number is the value; anything else leaves it as it was
  const settle = (n: number) => {
    setDraft(null)
    if (Number.isFinite(n) && clamp(n) !== value) onCommit(clamp(n))
  }
  const resetButton = (
    <button
      type="button"
      aria-label={`Reset ${label} to ${defaultValue}${suffix}`}
      title={`Reset to ${defaultValue}${suffix}`}
      disabled={shown === defaultValue}
      onClick={(e) => {
        e.preventDefault()
        setHeld(null)
        setDraft(null)
        onCommit(defaultValue)
      }}
      className="inline-flex cursor-pointer items-center text-fg-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-40 disabled:hover:text-fg-muted"
    >
      <LuRotateCcw className="size-[1.3em]" strokeWidth={2.5} />
    </button>
  )
  const options = presets.slice(0, grid.rows * grid.columns)
  // Wide enough for its columns of buttons
  const modalWidth = `${Math.max(10, grid.columns * 2.9 + 1.5 + (grid.columns - 1) * 0.25)}rem`
  return (
    <label className={`flex flex-col gap-1 ${className}`} onClick={(e) => scrubbed.current && e.preventDefault()}>
      <span className="flex justify-between text-small text-fg-muted">
        <span className={hideLabel ? 'sr-only' : undefined}>{label}</span>
        <span className="relative ms-auto flex items-center gap-1.5 tabular-nums">
          <span
            onPointerDown={scrub}
            title="Hold and move sideways to change, click to type"
            className="flex cursor-ew-resize touch-none select-none items-center gap-1 hover:text-fg"
          >
            <LuChevronsLeftRight className="size-[1.3em]" strokeWidth={2.5} aria-hidden />
            {shown}
            {suffix}
          </span>
          {resetButton}
          {draft !== null && (
            // In front of the number and the icons and out of the flow (nothing moves); pressing in it must not take the focus from the input (that would close it)
            <span
              role="dialog"
              aria-label={label}
              style={{ width: modalWidth }}
              onPointerDown={(e) => e.target instanceof HTMLInputElement || e.preventDefault()}
              onClick={(e) => e.preventDefault()}
              className="absolute end-0 -top-3 z-30 flex flex-col gap-3 rounded-(--menu-radius) border border-line bg-surface p-3 text-fg shadow-lg"
            >
              <span className="flex items-center justify-end gap-1.5 text-small tabular-nums">
                <LuChevronsLeftRight className="size-[1.3em] text-fg-muted" strokeWidth={2.5} aria-hidden />
                <span className="relative w-16">
                  <input
                    autoFocus
                    inputMode="numeric"
                    aria-label={label}
                    value={draft}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft(e.target.value.replace(/[^\d-]/g, ''))}
                    onBlur={() => settle(parseInt(draft, 10))}
                    onKeyDown={(e) => {
                      e.stopPropagation()
                      if (e.key === 'Enter') settle(parseInt(draft, 10))
                      else if (e.key === 'Escape') setDraft(null)
                      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                        e.preventDefault()
                        setDraft(String(clamp((parseInt(draft, 10) || 0) + (e.key === 'ArrowUp' ? step : -step))))
                      }
                    }}
                    className="w-full rounded-(--field-radius) border border-accent bg-surface py-0.5 ps-2 pe-6 text-end tabular-nums outline-none"
                  />
                  {suffix && <span className="pointer-events-none absolute inset-y-0 end-2 flex items-center text-fg-muted">{suffix}</span>}
                </span>
                {resetButton}
              </span>
              <span role="listbox" aria-label={`${label} presets`} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` }}>
                {options.map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="option"
                    aria-selected={p === shown}
                    onClick={() => settle(p)}
                    className="flex min-h-(--menu-item-h) cursor-pointer items-center justify-center rounded-(--menu-item-radius) border border-line px-1.5 py-1.5 text-body tabular-nums hover-fill aria-selected:border-accent aria-selected:bg-accent/10"
                  >
                    {p}
                    {suffix}
                  </button>
                ))}
              </span>
            </span>
          )}
        </span>
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
        // The circle is 14px wide, so its middle is a little off the plain share along the track
        style={{ '--fill': `calc(${fraction * 100}% + ${(0.5 - fraction) * 14}px)` } as CSSProperties}
        className="value-bar h-4 w-full cursor-pointer"
      />
    </label>
  )
}
