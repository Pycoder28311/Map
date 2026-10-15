import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { setPageInset } from '../../../../lib/pageInset'
import { SIDE_PANEL_PX, SIDE_PANEL_WIDE_PX } from '../../floating'

/**
 * Where the editor's right sidebar docks: it opens and closes by sliding (its width goes from 0 to its own and back in the
 * 0.2s the floating Create button takes to follow it), and changes width the same way between the narrow and the wide one. The
 * sidebar keeps its own width inside, so its contents never reflow while it moves, and while closing it keeps showing what it had.
 */
export default function SidebarSlot({ open, wide, children }: { open: boolean; wide: boolean; children: ReactNode }) {
  // What it last showed, to keep showing it while it closes
  const last = useRef<ReactNode>(null)
  if (open) last.current = children
  // In the page from the moment it opens until its closing has ended; `grown`: it has its width (it starts at 0 so that opening slides)
  const [mounted, setMounted] = useState(open)
  const [grown, setGrown] = useState(open)
  useEffect(() => {
    if (!open) return setGrown(false)
    setMounted(true)
    // Two frames: the first paints it at 0, the second gives it its width
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setGrown(true))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [open])
  // Remembers how wide it was, for the same reason
  const width = useRef(SIDE_PANEL_PX)
  if (open) width.current = wide ? SIDE_PANEL_WIDE_PX : SIDE_PANEL_PX
  // What floats at the page's bottom right (the Create button) moves in the very render that gives the sidebar its width, so the two start together
  const inset = open && grown ? width.current : 0
  useLayoutEffect(() => {
    setPageInset(inset)
  }, [inset])
  useEffect(() => () => setPageInset(0), [])
  if (!mounted) return null
  return (
    <div
      style={{ width: inset }}
      onTransitionEnd={(e) => e.target === e.currentTarget && !open && setMounted(false)}
      className="flex shrink-0 overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none"
    >
      {open ? children : last.current}
    </div>
  )
}
