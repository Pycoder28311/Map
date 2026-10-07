import { useLayoutEffect, type RefObject } from 'react'

// When the layout changes (a move, swap, drop, Detach), each pane glides from where it was to its
// new place instead of jumping there (the FLIP technique: First, Last, Invert, Play). Only transform
// and opacity animate, so the panes' content isn't laid out again on every frame.

const DURATION = 250
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** A snapshot older than this belongs to a change that didn't end on the workspace: ignored (ms) */
const MAX_AGE = 1000

let before: { at: number; rects: Map<string, DOMRect> } | null = null

/** Remembers where every pane ([data-pane]) is now; call right before changing the layout */
export function snapshotPanes() {
  const panes = document.querySelectorAll<HTMLElement>('[data-pane]')
  before = { at: performance.now(), rects: new Map([...panes].map((el) => [el.dataset.pane!, el.getBoundingClientRect()])) }
}

/**
 * Plays the glide after the layout (`layoutKey`) changed: each pane in `gridRef` starts drawn at its
 * old place and size and moves to the new one; a pane that wasn't there fades in.
 */
export function usePaneFlip(gridRef: RefObject<HTMLElement | null>, layoutKey: string) {
  useLayoutEffect(() => {
    const first = before
    before = null
    const grid = gridRef.current
    if (!first || !grid || performance.now() - first.at > MAX_AGE) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    for (const el of grid.querySelectorAll<HTMLElement>('[data-pane]')) {
      const from = first.rects.get(el.dataset.pane!)
      const to = el.getBoundingClientRect()
      if (!from) {
        el.animate([{ opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1 }], { duration: DURATION, easing: EASING })
        continue
      }
      const dx = from.left - to.left
      const dy = from.top - to.top
      const sx = from.width / to.width
      const sy = from.height / to.height
      if (dx === 0 && dy === 0 && sx === 1 && sy === 1) continue
      el.animate(
        [
          { transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
          { transformOrigin: 'top left', transform: 'none' },
        ],
        { duration: DURATION, easing: EASING },
      )
    }
  }, [gridRef, layoutKey])
}
