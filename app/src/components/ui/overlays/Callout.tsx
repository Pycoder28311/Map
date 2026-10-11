import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { LuX } from 'react-icons/lu'
import IconButton from '../buttons/IconButton'

// How far from what it sits beside (px), and its arrow's size
const GAP = 12
const ARROW = 10

type Props = {
  /** What it points at (vertically centred on it) */
  anchor: Element | null
  /** It sits to the right of this element's right edge (e.g. the sidebar); default: the anchor */
  beside?: Element | null
  onClose: () => void
  children: ReactNode
}

/**
 * A floating hint next to something, with an arrow pointing at it and a close button. It doesn't
 * block the page (the user can keep working, e.g. drag while it shows). In the top layer, so it's
 * never clipped; it follows its anchor on scroll and resize. Esc closes it.
 *
 *   <Callout anchor={button} beside={sidebar} onClose={…}>Drag an object onto the panes</Callout>
 */
export default function Callout({ anchor, beside, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const a = anchor.getBoundingClientRect()
      const b = (beside ?? anchor).getBoundingClientRect()
      setPos({ left: b.right + GAP, top: a.top + a.height / 2 })
    }
    place()
    ref.current?.showPopover()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, beside])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      ref={ref}
      popover="manual"
      role="status"
      style={pos ? { left: pos.left, top: pos.top } : undefined}
      className="fixed inset-auto m-0 max-w-72 -translate-y-1/2 overflow-visible rounded-(--card-radius) border border-line bg-surface p-0 text-fg shadow-xl animate-[callout-in_200ms_ease-out] motion-reduce:animate-none"
    >
      {/* The arrow: a square turned 45°, half of it showing, pointing left at the anchor */}
      <span
        aria-hidden
        style={{ width: ARROW, height: ARROW, left: -ARROW / 2 - 1 }}
        className="absolute top-1/2 -translate-y-1/2 rotate-45 border-b border-l border-line bg-surface"
      />
      <div className="relative flex items-start gap-2 py-2.5 ps-3.5 pe-1.5">
        <div className="flex-1 pt-0.5 text-body">{children}</div>
        <IconButton icon={LuX} label="Close" onClick={onClose} />
      </div>
    </div>
  )
}
