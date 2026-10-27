import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  /** The button that opens it */
  trigger: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Its name for screen readers */
  label: string
  /** As wide as the bar (the default is 18rem, and never wider than the bar) */
  wide?: boolean
  /** Which edges line up: start (default: left edges, under the bar), end (right edges, under a button at the end of a row) */
  align?: 'start' | 'end'
  children: ReactNode
}

/**
 * A panel hanging under the bar that holds its button (the nearest positioned ancestor: the map's floating bar, the article's
 * toolbar): left edges aligned (or right ones: `align="end"`), never wider than the bar, a gap below it. A click outside it or Esc closes it
 */
export default function BarPopover({ trigger, open, onOpenChange, label, wide, align = 'start', children }: Props) {
  const root = useRef<HTMLDivElement>(null)
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
      {open && (
        <div role="dialog" aria-label={label} className={`absolute ${align === 'end' ? 'end-0' : 'start-0'} top-full z-20 mt-2 ${wide ? 'w-full' : 'w-72'} max-w-full rounded-(--card-radius) border border-line bg-surface p-2 shadow-xl`}>
          {children}
        </div>
      )}
    </div>
  )
}
