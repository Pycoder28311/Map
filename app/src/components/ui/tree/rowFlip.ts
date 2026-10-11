// After a drop (or archive), the tree's rows glide from where they were to their new places instead
// of jumping (FLIP), with the Zen reel's reflow curve; rows that weren't there fade in.
import { useLayoutEffect } from 'react'
import { css, EASING, reducedMotion, TIMING } from './dragEffects'

/** A snapshot older than this belongs to a change that didn't re-render the tree: ignored (ms) */
const MAX_AGE = 1000

let before: { at: number; rects: Map<string, DOMRect> } | null = null

const rows = () => document.querySelectorAll<HTMLElement>('[data-row-id]')

/**
 * Remembers where every tree row ([data-row-id]) is now; call right before changing the tree.
 * `overrides`: rows to start from somewhere else (e.g. a dropped row: from where it was let go)
 */
export function snapshotRows(overrides: Record<string, DOMRect> = {}) {
  const rects = new Map([...rows()].map((el) => [el.dataset.rowId!, el.getBoundingClientRect()]))
  for (const [id, rect] of Object.entries(overrides)) rects.set(id, rect)
  before = { at: performance.now(), rects }
}

/** Plays the glide after the tree's data changed (`deps`), if a snapshot was taken just before */
export function useRowFlip(deps: unknown[]) {
  useLayoutEffect(() => {
    const first = before
    before = null
    if (!first || performance.now() - first.at > MAX_AGE || reducedMotion()) return
    const options = { duration: TIMING.reflow, easing: css(EASING.reflow) }

    for (const el of rows()) {
      const from = first.rects.get(el.dataset.rowId!)
      if (!from) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: TIMING.expand, easing: css(EASING.expand) })
        continue
      }
      const to = el.getBoundingClientRect()
      const dx = from.left - to.left
      const dy = from.top - to.top
      if (dx === 0 && dy === 0) continue
      el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0 0' }], options)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
