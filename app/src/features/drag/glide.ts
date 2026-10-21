// After a drop, the dragged object's faded copy (what it left in its place) slides to where it landed and turns solid, instead of
// appearing there at once. A glide has two steps: `beginGlide` remembers where the faded copy is (call it before the change) and `playGlide`
// waits for the lists to show the change (the move is shown at once but renders a frame later), then plays. The sliding thing is a copy of
// the item's new element on <body> (the strips and the sidebar clip what sticks out of them); the real one is hidden until it lands.
// The other things on screen that move to make room glide too (`snapshotReflow` / `playReflow`): sidebar rows, Dashboard cards and row
// headers, FLIP-style like the tree's rows after a drop.
// Elements are found by `data-glide="<panelType>:<id>"` and the surface they are on, `data-glide-in` (sidebar, dashboard).
import { css, EASING, reducedMotion, TIMING } from '../../components/ui/tree/dragEffects'
import type { ObjectDragInfo } from '../workspace/types'

const DURATION = 300
const SLIDE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
/** Frames to wait for the lists to show the change (about 200 ms) before giving up */
const MAX_FRAMES = 12
/** What it looks like while it leaves its place, as the faded copy there */
const FADED = 0.5
const ATTRIBUTES = ['data-glide', 'data-glide-in', 'data-row-id', 'data-share-id', 'data-drop-icon', 'data-flip-card', 'data-card-id']

type Point = { x: number; y: number }
export type GlideTicket = { key: string; surface: 'sidebar' | 'dashboard'; origin: Element; from: DOMRect; point: Point | null }

/** Whether two places differ by more than a pixel */
export const moved = (a: Pick<DOMRect, 'left' | 'top'>, b: Pick<DOMRect, 'left' | 'top'>) => Math.abs(a.left - b.left) > 1 || Math.abs(a.top - b.top) > 1

/** The index of the box whose centre is nearest to the point (the first, without a point) */
export function nearestTo(boxes: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>[], point: Point | null): number {
  if (!point) return 0
  const distance = (b: (typeof boxes)[number]) => Math.hypot(b.left + b.width / 2 - point.x, b.top + b.height / 2 - point.y)
  return boxes.reduce((best, box, i) => (distance(box) < distance(boxes[best]) ? i : best), 0)
}

const withKey = (key: string, surface: string) => `[data-glide="${CSS.escape(key)}"][data-glide-in="${surface}"]`

/**
 * Remembers where the dropped object's faded copy is now: its sidebar row (by the row id the drag carried), or its Dashboard card.
 * `float`: the lifted copy under the pointer (where it was let go). null when there is nothing to glide from
 */
export function beginGlide(object: ObjectDragInfo, float: Element | null): GlideTicket | null {
  if (!object.kind || !object.objectId || reducedMotion()) return null
  const key = `${object.kind}:${object.objectId}`
  const surface = object.source === 'sidebar' ? 'sidebar' : 'dashboard'
  const origin =
    surface === 'sidebar'
      ? object.nodeId
        ? document.querySelector(`[data-row-id="${CSS.escape(object.nodeId)}"]`)
        : null
      : document.querySelector(withKey(key, 'dashboard'))
  if (!origin) return null
  const box = float?.getBoundingClientRect()
  return { key, surface, origin, from: origin.getBoundingClientRect(), point: box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null }
}

/** Slides the object's element on that surface from where its faded copy was to where it is now, once the change is on screen */
export function playGlide(ticket: GlideTicket) {
  let frame = 0
  const attempt = () => {
    // An element that changed place, or one that is new (the old one may be gone, or stay where it is: a note also in the Notes section)
    const candidates = [...document.querySelectorAll<HTMLElement>(withKey(ticket.key, ticket.surface))].filter(
      (el) => el !== ticket.origin || moved(el.getBoundingClientRect(), ticket.from),
    )
    if (candidates.length === 0) {
      if (++frame < MAX_FRAMES) requestAnimationFrame(attempt)
      return
    }
    const target = candidates[nearestTo(candidates.map((el) => el.getBoundingClientRect()), ticket.point)]
    slide(target, ticket.from)
  }
  requestAnimationFrame(attempt)
}

function slide(target: HTMLElement, from: DOMRect) {
  const to = target.getBoundingClientRect()
  if (!moved(from, to)) return
  const ghost = target.cloneNode(true) as HTMLElement
  // A copy is not the element: nothing finds it, or drops on it
  for (const el of [ghost, ...ghost.querySelectorAll('*')]) ATTRIBUTES.forEach((name) => el.removeAttribute(name))
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${to.left}px`,
    top: `${to.top}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '1000',
  })
  const hidden = target.style.visibility
  target.style.visibility = 'hidden'
  document.body.appendChild(ghost)
  const land = () => {
    ghost.remove()
    target.style.visibility = hidden
  }
  const animation = ghost.animate(
    [
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, opacity: FADED },
      { transform: 'none', opacity: 1 },
    ],
    { duration: DURATION, easing: SLIDE_EASING },
  )
  animation.finished.then(land, land)
}

/* ─────────────── The others making room ─────────────── */

/** What glides to make room: the sidebar's rows, the Dashboard's cards, and what is marked `data-reflow` (the Dashboard's row headers) */
const REFLOW = '[data-row-id], [data-flip-card], [data-reflow]'
const reflowId = (el: HTMLElement) => (el.dataset.rowId ? `row:${el.dataset.rowId}` : el.dataset.flipCard ? `card:${el.dataset.flipCard}` : `mark:${el.dataset.reflow}`)

/** How far an element has to travel back to where it was, or null when it did not move (more than a pixel) */
export const travel = (from: Pick<DOMRect, 'left' | 'top'>, to: Pick<DOMRect, 'left' | 'top'>) =>
  moved(from, to) ? { dx: from.left - to.left, dy: from.top - to.top } : null

export type Reflow = { rects: Map<string, DOMRect>; skip: string }

/** Remembers where everything that could move is now (call before the change). `skip`: the dropped object's own key, which glides on its own */
export function snapshotReflow(skip: string): Reflow | null {
  if (reducedMotion()) return null
  const rects = new Map([...document.querySelectorAll<HTMLElement>(REFLOW)].map((el) => [reflowId(el), el.getBoundingClientRect()]))
  return { rects, skip }
}

/** Once the change is on screen, glides every other element from where it was to where it is (waits like playGlide) */
export function playReflow({ rects, skip }: Reflow) {
  let frame = 0
  const attempt = () => {
    const travelling = [...document.querySelectorAll<HTMLElement>(REFLOW)].flatMap((el) => {
      const from = rects.get(reflowId(el))
      const by = from && el.dataset.glide !== skip ? travel(from, el.getBoundingClientRect()) : null
      return by ? [{ el, by }] : []
    })
    if (travelling.length === 0) {
      if (++frame < MAX_FRAMES) requestAnimationFrame(attempt)
      return
    }
    for (const { el, by } of travelling) {
      el.animate([{ translate: `${by.dx}px ${by.dy}px` }, { translate: '0 0' }], { duration: TIMING.reflow, easing: css(EASING.reflow) })
    }
  }
  requestAnimationFrame(attempt)
}
