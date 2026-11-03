// How far an ExtendMenu's box moves so that it stays in view. It grows the same on both sides of its button; next to an edge (the button at the right end
// of a row, in a narrow window or pane) it moves over by just what would be cut off. Pure but for roomOf (extendShift.test.ts).

/** The least room it leaves to the edge (px): its corners' brackets and its shadow stay in view */
const EDGE_GAP = 4

type Span = { left: number; right: number }

/**
 * How far (px) a box of `width`, centred on `button`, must move to stay inside `room`: negative to the left, positive to the right, 0 when it
 * fits. With no room for all of it, its left edge is the one kept in view (where its text starts)
 */
export function extendShift(button: Span, width: number, room: Span): number {
  const middle = (button.left + button.right) / 2
  const left = middle - width / 2
  const right = middle + width / 2
  const pastRight = Math.max(0, right - (room.right - EDGE_GAP))
  const pastLeft = Math.max(0, room.left + EDGE_GAP - (left - pastRight))
  return Math.round(pastLeft - pastRight)
}

/** What an element has to grow in: the nearest parent that cuts off what goes past it (a pane), or the window */
export function roomOf(el: HTMLElement): Span {
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    if (getComputedStyle(parent).overflowX !== 'visible') {
      const { left, right } = parent.getBoundingClientRect()
      return { left, right }
    }
  }
  return { left: 0, right: window.innerWidth }
}
