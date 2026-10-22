// Keeps a folder's children on screen while they slide away, and drives their slide in. Open: they are drawn closed for a frame, then shown
// (the CSS transition does the rest). Closed: they are shown closed at once and removed after `ms`, when the slide is over. `settled`: fully
// open and still (nothing needs to be clipped any more).
import { useEffect, useState } from 'react'

export function useCollapsible(open: boolean, ms: number) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(open)
  const [settled, setSettled] = useState(open)

  useEffect(() => {
    let first = 0
    let second = 0
    let timer = 0
    if (open) {
      setMounted(true)
      if (ms === 0) {
        setShown(true)
        setSettled(true)
      } else {
        // Two frames: the closed look is drawn before it is told to open, or there is nothing to move from
        first = requestAnimationFrame(() => {
          second = requestAnimationFrame(() => setShown(true))
        })
        timer = window.setTimeout(() => setSettled(true), ms + 40)
      }
    } else {
      setShown(false)
      setSettled(false)
      timer = window.setTimeout(() => setMounted(false), ms)
    }
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
      window.clearTimeout(timer)
    }
  }, [open, ms])

  return { mounted: mounted || open, shown: shown && open, settled: settled && open }
}
