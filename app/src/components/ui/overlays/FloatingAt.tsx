import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** A point of the page to float beside: the line it is on (viewport px) */
export type Anchor = { left: number; top: number; bottom: number }

type Props = {
  /** Where it floats: read again on scroll and resize (the text can move under it) */
  anchor: () => Anchor
  /** Above the anchor's line or below it (it goes to the other side when there is no room); it never covers the line */
  side: 'above' | 'below'
  /** A press outside it (and outside any element it names with `data-floating-keep`) or Esc */
  onDismiss?: () => void
  /** Its name for screen readers */
  label: string
  /** Its box (a border, a background…); a layout only: it places itself */
  className?: string
  children: ReactNode
}

/** The gap between the line and the floating box: --spacing-sm (tokens.css) */
const GAP = 4
/** How close it may come to the window's edges */
const MARGIN = 8

/**
 * A box floating beside a line of text (the article's `/` menu under the caret's row, the `@` links row above it), in the top layer so no
 * pane clips it. Its left edge is at the anchor, pushed back inside the window
 */
export default function FloatingAt({ anchor, side, onDismiss, label, className = '', children }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null)
  // The latest props, read by the listeners
  const latest = useRef({ anchor, side, onDismiss })
  useLayoutEffect(() => {
    latest.current = { anchor, side, onDismiss }
  })

  /** Places it from the anchor now (again whenever it renders, scrolls or is resized) */
  const measure = useRef(() => {
    const el = box.current
    if (!el) return
    const at = latest.current.anchor()
    const wanted = latest.current.side
    const { width, height } = el.getBoundingClientRect()
    const below = at.bottom + GAP
    const above = at.top - GAP - height
    const fitsBelow = below + height <= window.innerHeight - MARGIN
    const fitsAbove = above >= MARGIN
    const top = wanted === 'below' ? (fitsBelow || !fitsAbove ? below : above) : fitsAbove || !fitsBelow ? above : below
    const left = Math.min(Math.max(at.left, MARGIN), Math.max(MARGIN, window.innerWidth - width - MARGIN))
    setPlace((old) => (old && old.left === left && old.top === top ? old : { left, top }))
  })
  useLayoutEffect(() => measure.current())

  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (!el.matches(':popover-open')) el.showPopover()
    const redo = () => measure.current()
    const watcher = new ResizeObserver(redo)
    watcher.observe(el)
    window.addEventListener('scroll', redo, true)
    window.addEventListener('resize', redo)
    return () => {
      watcher.disconnect()
      window.removeEventListener('scroll', redo, true)
      window.removeEventListener('resize', redo)
    }
  }, [])

  useEffect(() => {
    const outside = (e: PointerEvent) => {
      const target = e.target as Element | null
      if (box.current?.contains(target) || target?.closest?.('[data-floating-keep]')) return
      latest.current.onDismiss?.()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || box.current?.querySelector('dialog[open]')) return
      latest.current.onDismiss?.()
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', esc)
    }
  }, [])

  return (
    <div
      ref={box}
      popover="manual"
      role="dialog"
      aria-label={label}
      style={{ left: place?.left ?? 0, top: place?.top ?? 0, visibility: place ? 'visible' : 'hidden' }}
      className={`fixed inset-auto m-0 overflow-visible text-fg ${className}`}
    >
      {children}
    </div>
  )
}
