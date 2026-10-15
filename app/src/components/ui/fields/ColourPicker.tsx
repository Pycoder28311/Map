import { useRef, useState, type PointerEvent } from 'react'
import { COMMON_COLOURS, hexToHsv, hsvToHex, hsvToRgb, parseHex, rgbToHex, type Hsv } from './colour'

type Props = {
  /** The colour it opens with */
  value: string
  /** While a pointer drags the square or the hue */
  onLive: (hex: string) => void
  /** When it is let go, or a colour is typed or picked from the common ones */
  onCommit: (hex: string) => void
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Where in an element a pointer is, 0–1 across and down */
function within(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) }
}

/**
 * The colour picker that opens by a colour input: a square of saturation (across) and brightness (up), the hue, then red,
 * green, blue and the hex code as numbers, and a row of common colours. Remembers its hue even when the colour is grey.
 */
export default function ColourPicker({ value, onLive, onCommit }: Props) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  // What is typed in a field until Enter or leaving it, with the field's name
  const [typed, setTyped] = useState<{ field: string; text: string } | null>(null)
  const dragging = useRef(false)
  const rgb = hsvToRgb(hsv)
  const hex = hsvToHex(hsv)

  const move = (next: Hsv, final: boolean) => {
    setHsv(next)
    const out = hsvToHex(next)
    if (final) onCommit(out)
    else onLive(out)
  }
  const drag = (apply: (e: PointerEvent<HTMLElement>) => Hsv) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragging.current = true
      move(apply(e), false)
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => dragging.current && move(apply(e), false),
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      if (!dragging.current) return
      dragging.current = false
      move(apply(e), true)
    },
  })

  const take = (text: string) => {
    const next = parseHex(text)
    if (next && next !== hex) {
      setHsv(hexToHsv(next))
      onCommit(next)
    }
  }
  const field = (name: string, shown: string, onDone: (text: string) => void, width = 'w-full') => (
    <label className="flex min-w-0 flex-1 flex-col gap-0.5 text-center text-small text-fg-muted">
      {name}
      <input
        value={typed?.field === name ? typed.text : shown}
        aria-label={name}
        inputMode={name === 'Hex' ? 'text' : 'numeric'}
        onChange={(e) => setTyped({ field: name, text: e.target.value })}
        onBlur={() => {
          if (typed?.field === name) onDone(typed.text)
          setTyped(null)
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={`${width} rounded-(--field-radius) border border-line-strong bg-surface px-1 py-1 text-center text-body tabular-nums text-fg outline-none focus-visible:border-fg-subtle`}
      />
    </label>
  )
  const channel = (name: 'R' | 'G' | 'B', key: 'r' | 'g' | 'b') =>
    field(name, String(rgb[key]), (text) => {
      const n = Math.round(Number(text))
      if (text.trim() !== '' && Number.isFinite(n)) take(rgbToHex({ ...rgb, [key]: Math.min(255, Math.max(0, n)) }))
    })

  return (
    <div className="flex w-56 flex-col gap-3">
      <div
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuetext={`${Math.round(hsv.s * 100)}% saturation, ${Math.round(hsv.v * 100)}% brightness`}
        aria-valuenow={Math.round(hsv.v * 100)}
        tabIndex={0}
        {...drag((e) => ({ ...hsv, s: within(e).x, v: 1 - within(e).y }))}
        style={{ backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }), backgroundImage: 'linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)' }}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-(--corner-sm)"
      >
        <span
          aria-hidden
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hex }}
          className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]"
        />
      </div>
      <div
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        {...drag((e) => ({ ...hsv, h: within(e).x * 360 }))}
        style={{ backgroundImage: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)' }}
        className="relative h-3 w-full cursor-pointer touch-none rounded-full"
      >
        <span
          aria-hidden
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hsvToHex({ h: hsv.h, s: 1, v: 1 }) }}
          className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]"
        />
      </div>
      <div className="flex gap-1">
        {channel('R', 'r')}
        {channel('G', 'g')}
        {channel('B', 'b')}
      </div>
      <div className="flex">{field('Hex', hex, take)}</div>
      <div className="grid grid-cols-6 gap-1.5">
        {COMMON_COLOURS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            title={c}
            onClick={() => {
              setHsv(hexToHsv(c))
              onCommit(c)
            }}
            style={{ backgroundColor: c }}
            className={`h-6 cursor-pointer rounded-(--btn-close-radius) border ${c === hex ? 'border-fg' : 'border-line-strong'}`}
          />
        ))}
      </div>
    </div>
  )
}
