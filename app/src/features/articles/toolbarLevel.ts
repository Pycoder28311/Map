// How narrow the article's toolbar is, in steps (docs/plans/32): from its own width, since a pane can be narrow on a wide screen.
// Pure but for the hook (toolbarLevel.test.ts).
import { useLayoutEffect, useState } from 'react'

/**
 * 0: everything in its place. 1: the alignments are one dropdown, the Ω box only its Ω. 2: the colours go to the second row too.
 * 3 (a phone): the rows wrap, into as many rows as they need
 */
export type ToolbarLevel = 0 | 1 | 2 | 3

/** The narrowest width (px) of each level; tuned by eye, here only */
export const LEVEL_WIDTHS = { full: 960, one: 800, two: 640 } as const

export function toolbarLevel(width: number): ToolbarLevel {
  if (width >= LEVEL_WIDTHS.full) return 0
  if (width >= LEVEL_WIDTHS.one) return 1
  if (width >= LEVEL_WIDTHS.two) return 2
  return 3
}

/** The level of an element's width, again whenever it is resized. Give `ref` to the element (it may come later: the toolbar waits for its editor) */
export function useToolbarLevel(): [ToolbarLevel, (el: HTMLElement | null) => void] {
  const [el, ref] = useState<HTMLElement | null>(null)
  const [level, setLevel] = useState<ToolbarLevel>(0)
  useLayoutEffect(() => {
    if (!el) return
    const watcher = new ResizeObserver(([entry]) => setLevel(toolbarLevel(entry.contentRect.width)))
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [el])
  return [level, ref]
}
