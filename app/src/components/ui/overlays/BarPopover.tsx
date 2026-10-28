import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  /** The button that opens it */
  trigger: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Its name for screen readers */
  label: string
  /** As wide as the bar (the default is 18rem, and never wider than the bar) */
  wide?: boolean
  /** Its width when it is not `wide`, a Tailwind class (default w-72, 18rem); never wider than the bar either */
  width?: string
  /** Which edges line up: start (default: left edges, under the bar), end (right edges, under a button at the end of a row), center (centred under the bar: a centred row) */
  align?: 'start' | 'end' | 'center'
  /**
   * Not held to the bar: in the top layer (no box around the bar clips it), `width` wide but never wider than the window, centred under
   * the bar and kept inside the window. For a panel wider than its bar (the article's Autolinker)
   */
  free?: boolean
  children: ReactNode
}

/** How far a free panel stays from the window's edges, and below the bar (px) */
const MARGIN = 16
const GAP = 8

/**
 * A panel hanging under the bar that holds its button (the nearest positioned ancestor: the map's floating bar, the article's
 * toolbar): left edges aligned (or right ones: `align="end"`), never wider than the bar, a gap below it. A click outside it or Esc closes it
 */
export default function BarPopover({ trigger, open, onOpenChange, label, wide, width = 'w-72', align = 'start', free = false, children }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)

  // A free panel: shown in the top layer, under the bar's middle, inside the window; placed again when the page scrolls or resizes
  useLayoutEffect(() => {
    const el = panel.current
    if (!free || !open || !el) return
    if (!el.matches(':popover-open')) el.showPopover()
    const measure = () => {
      const bar = (root.current?.offsetParent ?? root.current)?.getBoundingClientRect()
      if (!bar) return
      const w = el.offsetWidth
      const left = Math.min(Math.max(bar.left + bar.width / 2 - w / 2, MARGIN), window.innerWidth - MARGIN - w)
      setPlace({ left: Math.max(left, MARGIN), top: bar.bottom + GAP })
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [free, open])
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && onOpenChange(false)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', esc, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', esc, true)
    }
  }, [open, onOpenChange])
  return (
    <div ref={root}>
      {trigger}
      {open && free && (
        <div
          ref={panel}
          popover="manual"
          role="dialog"
          aria-label={label}
          style={{ left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? 'visible' : 'hidden' }}
          className={`fixed inset-auto m-0 ${width} max-h-[calc(100vh-6rem)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-(--card-radius) border border-line bg-surface p-2 text-fg shadow-xl`}
        >
          {children}
        </div>
      )}
      {open && !free && (
        <div role="dialog" aria-label={label} className={`absolute ${align === 'end' ? 'end-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'start-0'} top-full z-20 mt-2 ${wide ? 'w-full' : width} max-w-full rounded-(--card-radius) border border-line bg-surface p-2 shadow-xl`}>
          {children}
        </div>
      )}
    </div>
  )
}
