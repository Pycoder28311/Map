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
  /** Its width when it is not `wide`, a Tailwind class (default w-72, 18rem); never wider than the bar either */
  width?: string
  /** Which edges line up: start (default: left edges, under the bar), end (right edges, under a button at the end of a row), center (centred under the bar: a centred row) */
  align?: 'start' | 'end' | 'center'
  /** Not held to the width of the positioned element it hangs from (a button's own wrapper): only the window limits it */
  overflow?: boolean
  children: ReactNode
}


/**
 * A panel hanging under the bar that holds its button (the nearest positioned ancestor: the map's floating bar, the article's
 * toolbar): left edges aligned (or right ones: `align="end"`), never wider than the bar, a gap below it. A click outside it or Esc closes it
 */
export default function BarPopover({ trigger, open, onOpenChange, label, wide, width = 'w-72', align = 'start', overflow = false, children }: Props) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && onOpenChange(false)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // A modal opened from inside it (a confirmation) takes the Esc first
      if (root.current?.querySelector('dialog[open]')) return
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
        <div role="dialog" aria-label={label} className={`absolute ${align === 'end' ? 'end-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'start-0'} top-full z-20 mt-2 ${wide ? 'w-full' : width} ${overflow ? 'max-w-[calc(100vw-2rem)]' : 'max-w-full'} rounded-(--card-radius) border border-line bg-surface p-2 shadow-xl`}>
          {children}
        </div>
      )}
    </div>
  )
}
