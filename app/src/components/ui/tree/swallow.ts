// The Zen reel's headline effect, in the DOM: something dropped into a closed folder (or the trash).
// The lid comes up first, the thing falls in on a curve that accelerates the whole way (so it reads
// as going in), the folder gulps once it has it and a few sparks fly out. Plays in a fixed layer on
// <body>, so the tree re-rendering underneath can't cut it. Numbers: dragEffects.ts.
import { useSyncExternalStore } from 'react'
import { bezier, clamp01, EASING, mix, MOTION, reducedMotion, TIMING } from './dragEffects'

/* ─────────────── Lids: which folders (or the trash) show open while something goes in ─────────────── */

const lids = new Set<string>()
const lidListeners = new Set<() => void>()
let lidVersion = 0

function setLid(key: string, open: boolean) {
  if (open) lids.add(key)
  else lids.delete(key)
  lidVersion++
  lidListeners.forEach((l) => l())
}

const subscribeLids = (listener: () => void) => {
  lidListeners.add(listener)
  return () => lidListeners.delete(listener)
}

/** Whether `key`'s lid is up right now (a tree row's id, or e.g. "trash") */
export function useLidOpen(key: string) {
  useSyncExternalStore(subscribeLids, () => lidVersion)
  return lids.has(key)
}

/** The same for any key (re-renders when a lid moves), e.g. for a whole tree */
export function useLids() {
  useSyncExternalStore(subscribeLids, () => lidVersion)
  return (key: string) => lids.has(key)
}

/* ─────────────── The swallow ─────────────── */

/** How long the thing waits where it was let go before it starts to fall (ms): none, it sets off at once while the lid opens */
const FALL_LEAD = 0
/** From the drop until it is all the way in (ms): when whatever it left behind can go */
export const FALL_MS = FALL_LEAD + TIMING.swallow

const ease = {
  swallow: bezier(EASING.swallow),
  fade: bezier(EASING.fade),
  spark: bezier(EASING.spark),
}

const STEPS = 24
const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

type Options = {
  /** What falls in: cloned where it is now (e.g. the lifted row, or a row archived from its menu) */
  source: Element
  /** Where it goes: the folder's (or trash's) icon */
  to: Element
  /** Whose lid opens meanwhile (useLidOpen) */
  lidKey: string
  /** The source is the lifted row (its lift animation is on an inner `[data-lifted-row]`): the copy keeps its tilt and size as they are now */
  lifted?: boolean
}

/**
 * Plays the swallow; does nothing with reduced motion. Call it right before changing the data: the
 * copy is taken at once (the source may go away), and the target is measured on the next frame,
 * after the tree has settled in its new layout.
 */
export function swallow({ source, to, lidKey, lifted = false }: Options) {
  if (reducedMotion()) return
  const from = source.getBoundingClientRect()
  if (!from.width) return

  // The flying copy, exactly where the source is (its rect already includes the lift's scale)
  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  Object.assign(clone.style, {
    position: 'fixed',
    left: `${from.left}px`,
    top: `${from.top}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '1000',
    transform: 'none',
    transformOrigin: 'center',
  })
  clone.setAttribute('aria-hidden', 'true')
  // A copy put in the page starts every CSS animation of it again: the float's own "grows in" (opacity and scale from 0) would play
  // on the copy at the moment it takes over, as if it appeared anew. The copy only continues what the float was
  for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) el.style.animation = 'none'
  // An animation is not copied with an element: the copy of a lifted row would show it flat and small for a moment, then snap. So it
  // starts as the row looks now (the tilt and size the lift animation has reached), and the fall goes on from there
  let liftedNow = false
  if (lifted) {
    const copies = clone.querySelectorAll<HTMLElement>('[data-lifted-row]')
    source.querySelectorAll<HTMLElement>('[data-lifted-row]').forEach((row, i) => {
      const transform = getComputedStyle(row).transform
      if (transform !== 'none' && copies[i]) {
        copies[i].style.transform = transform
        copies[i].style.animation = 'none'
        liftedNow = true
      }
    })
  }
  document.body.appendChild(clone)

  setLid(lidKey, true)
  requestAnimationFrame(() => fall(clone, from, to, lidKey, liftedNow))
}

function fall(clone: HTMLElement, from: DOMRect, dropIcon: Element, lidKey: string, lifted: boolean) {
  // The drop changed the tree: a row that got its first child became a folder, with a new icon element under the same key
  const to = dropIcon.isConnected ? dropIcon : (document.querySelector(`[data-drop-icon="${CSS.escape(lidKey)}"]`) ?? dropIcon)
  const target = to.getBoundingClientRect()
  if (!to.isConnected || !target.width) {
    clone.remove()
    setLid(lidKey, false)
    return
  }

  // A curve, so it arcs into the folder's mouth rather than sliding along a ruler
  const a = center(from)
  const b = center(target)
  const bx = mix(a.x, b.x, 0.5) + (b.y - a.y) * MOTION.swallowArc * 0.35
  const by = mix(a.y, b.y, 0.5) - Math.abs(b.x - a.x) * MOTION.swallowArc * 0.2
  // A lifted copy carries its own tilt and size: the fall adds to them
  const startRotate = 0
  // Shrinks towards the icon's size, as a share of where it started
  const endScale = MOTION.swallowScale / (lifted ? MOTION.liftScale : 1)

  const frames = Array.from({ length: STEPS + 1 }, (_, i) => {
    const p = i / STEPS
    const k = ease.swallow(p)
    const u = 1 - k
    const x = u * u * a.x + 2 * u * k * bx + k * k * b.x
    const y = u * u * a.y + 2 * u * k * by + k * k * b.y
    // On the raw progress, not on k: k accelerates hard at the end, which would pop rather than fade
    const fade = ease.fade(clamp01((p - MOTION.swallowFadeFrom) / (1 - MOTION.swallowFadeFrom)))
    return {
      transform: `translate(${x - a.x}px, ${y - a.y}px) rotate(${mix(startRotate, MOTION.swallowSpin, k)}deg) scale(${mix(1, endScale, k)})`,
      opacity: MOTION.dragAlpha * (1 - fade),
    }
  })
  clone
    .animate(frames, { duration: TIMING.swallow, delay: FALL_LEAD, easing: 'linear', fill: 'both' })
    .finished.finally(() => clone.remove())

  // The lid comes up with a little pulse
  to.animate([{ scale: '1' }, { scale: `${1 + MOTION.lidLift}` }, { scale: '1' }], { duration: TIMING.openLead * 2, easing: 'ease-out' })

  // The gulp: starts before the item is all the way in, so the folder reacts to it arriving
  const gulpAt = FALL_MS - TIMING.gulpOverlap
  const gulp = Array.from({ length: 13 }, (_, i) => {
    const g = i / 12
    const squash = MOTION.gulpSquash * Math.sin(Math.PI * g ** MOTION.gulpSkew)
    return { scale: `${1 + squash * 0.6} ${1 - squash}` }
  })
  to.animate(gulp, { duration: TIMING.gulp, delay: gulpAt, easing: 'linear' })
  sparks({ x: b.x, y: b.y - 4 }, gulpAt)

  window.setTimeout(() => setLid(lidKey, false), gulpAt + TIMING.gulp + TIMING.closeBack / 2)
}

/**
 * A few specks thrown out of the mouth as it goes down: each sets off a little after the one before,
 * slows as it travels, and fades up and back down on a sine
 */
function sparks(at: { x: number; y: number }, delay: number) {
  for (let i = 0; i < MOTION.sparkCount; i++) {
    const lag = (i / MOTION.sparkCount) * MOTION.sparkLag
    const spread = (i / (MOTION.sparkCount - 1) - 0.5) * MOTION.sparkSpread
    const angle = -Math.PI / 2 + spread
    const reach = MOTION.sparkReach * (0.62 + ((i * 37) % 11) / 13)
    const size = MOTION.sparkSize * 2

    const dot = document.createElement('span')
    Object.assign(dot.style, {
      position: 'fixed',
      left: `${at.x - size / 2}px`,
      top: `${at.y - size / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--drop)',
      pointerEvents: 'none',
      zIndex: '1001',
      opacity: '0',
    })
    dot.setAttribute('aria-hidden', 'true')
    document.body.appendChild(dot)

    const frames = Array.from({ length: 13 }, (_, j) => {
      const p = j / 12
      const q = clamp01((p - lag) / (1 - lag))
      const d = reach * ease.spark(q)
      return {
        transform: `translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d + MOTION.sparkFall * q * q}px) scale(${1 - q * 0.45})`,
        opacity: Math.sin(Math.PI * q) * MOTION.sparkAlpha,
      }
    })
    dot.animate(frames, { duration: TIMING.gulp, delay, easing: 'linear', fill: 'both' }).finished.finally(() => dot.remove())
  }
}
