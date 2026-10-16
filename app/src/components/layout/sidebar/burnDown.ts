// A deleted object goes behind the sidebar's rows, falls to its bottom and sinks into the embers, which catch fire
// (SidebarPixels listens for BURN_EVENT). Only where the embers are on (a theme turns them on).
import { reducedMotion } from '../../ui/tree/dragEffects'

/** Fired on `window` when the fallen object reaches the bottom */
export const BURN_EVENT = 'sidebar-burn'

/** Below the sidebar's rows (z-index auto), above the embers (-10) */
const BEHIND = '-5'
/** How many small squares it breaks into when it lands */
const PARTICLES = 16
/** How far above the sidebar's bottom edge it comes to rest (px) */
const REST_GAP = 14

/**
 * Plays the fall for a copy of `source`; false (nothing played) when the embers are off, the sidebar isn't there or motion is
 * reduced, so the caller can use another effect. Call it right before the data changes: the copy is taken at once.
 */
export function burnDown(source: Element | null): boolean {
  const nav = document.getElementById('sidebar')
  if (!source || !nav || reducedMotion()) return false
  if (getComputedStyle(nav).getPropertyValue('--sidebar-pixels-display').trim() === 'none') return false
  const from = source.getBoundingClientRect()
  const base = nav.getBoundingClientRect()
  if (!from.width || !base.height) return false

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
  nav.appendChild(clone)

  // Gravity: slow at first, quick at the end; it tips a little, shrinks and fades as it falls, then is gone
  const distance = Math.max(0, base.bottom - REST_GAP - from.bottom)
  const duration = Math.min(1700, 700 + distance * 0.9)
  const tilt = (from.top % 2 ? 1 : -1) * 7
  const down = `translateY(${distance}px) rotate(${tilt}deg) scale(0.5)`
  clone
    .animate(
      [
        { transform: 'none', opacity: 0.95, easing: 'cubic-bezier(0.5, 0, 0.9, 0.45)' },
        { transform: down, opacity: 0.2, offset: 0.97 },
        { transform: down, opacity: 0 },
      ],
      { duration, fill: 'both' },
    )
    .finished.finally(() => clone.remove())

  // Where it lands: it breaks into small squares there, which fly up a little, drop and fade
  const landX = from.left - base.left + from.width / 2
  const landY = from.top - base.top + distance + from.height / 2
  for (let i = 0; i < PARTICLES; i++) {
    const size = 2 + Math.floor(Math.random() * 3) * 1.5
    const x = landX + (Math.random() - 0.5) * from.width * 0.5
    const y = landY + (Math.random() - 0.5) * from.height * 0.4
    const spark = document.createElement('span')
    Object.assign(spark.style, {
      position: 'absolute',
      left: `${x - size / 2}px`,
      top: `${y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      background: Math.random() < 0.35 ? 'var(--sidebar-fire)' : 'color-mix(in srgb, var(--fg) 40%, transparent)',
      pointerEvents: 'none',
      zIndex: BEHIND,
      opacity: '0',
    })
    spark.setAttribute('aria-hidden', 'true')
    nav.appendChild(spark)
    const dx = (x - landX) * 1.6 + (Math.random() - 0.5) * 16
    const up = 8 + Math.random() * 18
    spark
      .animate(
        [
          { transform: 'translate(0, 0)', opacity: 0.9 },
          { transform: `translate(${dx * 0.6}px, ${-up}px)`, opacity: 0.8, offset: 0.4 },
          { transform: `translate(${dx}px, ${REST_GAP * 0.6}px)`, opacity: 0 },
        ],
        { duration: 500 + Math.random() * 400, delay: duration * 0.97, easing: 'ease-out', fill: 'both' },
      )
      .finished.finally(() => spark.remove())
  }

  window.setTimeout(() => window.dispatchEvent(new Event(BURN_EVENT)), duration * 0.95)
  return true
}
