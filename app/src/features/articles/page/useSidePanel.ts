import { useEffect, useState } from 'react'
import type { SidePart } from '../side/RoundTools'
import { SIDE_SLIDE_MS } from './pageConfig'

/**
 * The left column's element the round buttons opened (one at a time; none at first). The column keeps showing what it showed while it
 * slides closed (`kept`; then it is emptied)
 */
export function useSidePanel() {
  const [side, setSide] = useState<Set<SidePart>>(() => new Set())
  const [kept, setKept] = useState<Set<SidePart>>(side)
  if (side.size > 0 && side !== kept) setKept(side)
  useEffect(() => {
    if (side.size > 0) return
    const id = window.setTimeout(() => setKept(new Set()), SIDE_SLIDE_MS)
    return () => window.clearTimeout(id)
  }, [side])
  /** A round button: opens its element and closes the one that was open, or closes its own */
  const toggleSide = (part: SidePart) => setSide(side.has(part) ? new Set() : new Set([part]))
  return { side, kept, open: side.size > 0, toggleSide }
}
