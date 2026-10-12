import { useLayoutEffect, type RefObject } from 'react'

// When the Dashboard's columns change (swap, drag, a section lifted up into a column), each block
// ([data-dash-block]: a column or a section) glides from where it was to its new place (FLIP, like
// workspace/paneFlip.ts). A block keeps its key when it changes shape (a section becoming a column),
// so it glides from the section's place; one that goes away fades out where it was; a new one fades in.

const DURATION = 250
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** A snapshot older than this belongs to a change that didn't happen here: ignored (ms) */
const MAX_AGE = 1000

// Blocks live in more than one area ([data-flip-root]: the columns, the sections); a block may move
// from one to the other, so each area glides its own blocks from wherever they were, and fades out
// only those that were in it and are gone from the page
type Snapshot = {
  at: number
  blocks: Map<string, { rect: DOMRect; el: HTMLElement; root?: string }>
  /** The areas that played it already */
  done: Set<string>
}
let before: Snapshot | null = null

/** Remembers where every block is now; call right before changing the columns */
export function snapshotBlocks() {
  const els = document.querySelectorAll<HTMLElement>('[data-dash-block]')
  before = {
    at: performance.now(),
    blocks: new Map(
      [...els].map((el) => [
        el.dataset.dashBlock!,
        { rect: el.getBoundingClientRect(), el, root: el.closest<HTMLElement>('[data-flip-root]')?.dataset.flipRoot },
      ]),
    ),
    done: new Set(),
  }
}

/**
 * Plays the glide after the blocks in `rootRef` changed (`key`: what changed, e.g. the column ids).
 * The root element needs `data-flip-root={name}`.
 */
export function useBlockFlip(rootRef: RefObject<HTMLElement | null>, name: string, key: string) {
  useLayoutEffect(() => {
    const first = before
    const root = rootRef.current
    if (!first || !root || first.done.has(name) || performance.now() - first.at > MAX_AGE) return
    first.done.add(name)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const now = new Set<string>()
    for (const el of root.querySelectorAll<HTMLElement>('[data-dash-block]')) {
      const id = el.dataset.dashBlock!
      now.add(id)
      const from = first.blocks.get(id)?.rect
      const to = el.getBoundingClientRect()
      if (!from) {
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: DURATION, easing: EASING })
        continue
      }
      const dx = from.left - to.left
      const dy = from.top - to.top
      if (dx === 0 && dy === 0) continue
      // Changed shape (a section becoming a column): no scaling (it would squash the content), a fade instead
      const reshaped = Math.abs(from.width - to.width) > 4 || Math.abs(from.height - to.height) > 4
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)`, opacity: reshaped ? 0.3 : 1 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: DURATION, easing: EASING },
      )
    }

    // Gone from the page (e.g. a column replaced by a section): a copy fades out where it was
    for (const [id, { rect, el, root: from }] of first.blocks) {
      if (from !== name || now.has(id) || document.querySelector(`[data-dash-block="${CSS.escape(id)}"]`)) continue
      const ghost = el.cloneNode(true) as HTMLElement
      Object.assign(ghost.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        margin: '0',
        pointerEvents: 'none',
        zIndex: '5',
      })
      ghost.removeAttribute('data-dash-block')
      document.body.appendChild(ghost)
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DURATION, easing: EASING }).finished.finally(() => ghost.remove())
    }
  }, [rootRef, name, key])
}
