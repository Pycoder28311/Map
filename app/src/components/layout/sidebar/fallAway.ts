// A sidebar row archived from its menu: its copy drops a little behind the rows below it and fades away, fast. It stays inside the
// sidebar (appended to it, under the rows), so it never reaches the Trash bin or the page beside it.
import { reducedMotion } from '../../ui/tree/dragEffects'
import { freezeCopy } from '../../ui/tree/swallow'

/** Below the sidebar's rows (z-index auto), above the embers (-10), as burnDown.ts */
const BEHIND = '-5'
/** How long it takes to be gone (ms) */
const DURATION = 320
/** How far it drops (px) */
const DROP = 56

/** Plays the fall for a copy of `source`; call it right before the data changes (the copy is taken at once). Nothing plays when motion is reduced */
export function fallAway(source: Element | null) {
  const nav = document.getElementById('sidebar')
  if (!source || !nav || reducedMotion()) return
  const from = source.getBoundingClientRect()
  const base = nav.getBoundingClientRect()
  if (!from.width) return

  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  clone.setAttribute('aria-hidden', 'true')
  Object.assign(clone.style, {
    position: 'absolute',
    left: `${from.left - base.left}px`,
    top: `${from.top - base.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: BEHIND,
    transform: 'none',
  })
  freezeCopy(clone, source, false)
  nav.appendChild(clone)

  // Slow for a blink, then quick; it shrinks a little and is gone
  clone
    .animate(
      [
        { transform: 'none', opacity: 0.95, easing: 'cubic-bezier(0.5, 0, 0.9, 0.45)' },
        { transform: `translateY(${DROP}px) scale(0.92)`, opacity: 0 },
      ],
      { duration: DURATION, fill: 'both' },
    )
    .finished.finally(() => clone.remove())
}
