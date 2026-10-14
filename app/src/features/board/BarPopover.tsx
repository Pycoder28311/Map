import { useEffect, useRef, type ReactNode } from 'react'

type Props = {
  /** The button that opens it */
  trigger: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Its name for screen readers */
  label: string
  children: ReactNode
}

/** A panel hanging under a button of the top-right bar, right edges aligned. A click outside it or Esc closes it */
export default function BarPopover({ trigger, open, onOpenChange, label, children }: Props) {
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
    <div ref={root} className="relative">
      {trigger}
      {open && (
        <div role="dialog" aria-label={label} className="absolute end-0 top-full z-20 mt-2 w-72 rounded-(--card-radius) border border-line bg-surface p-2 shadow-xl">
          {children}
        </div>
      )}
    </div>
  )
}
