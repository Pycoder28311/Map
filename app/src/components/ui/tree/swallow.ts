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
  /** The source is the lifted row (already tilted): the fall starts from its tilt */
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
  document.body.appendChild(clone)

  setLid(lidKey, true)
  requestAnimationFrame(() => fall(clone, from, to, lidKey, lifted))
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
  const startRotate = lifted ? MOTION.liftTilt : 0
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
    .animate(frames, { duration: TIMING.swallow, delay: TIMING.openLead, easing: 'linear', fill: 'both' })
    .finished.finally(() => clone.remove())

  // The lid comes up with a little pulse
  to.animate([{ scale: '1' }, { scale: `${1 + MOTION.lidLift}` }, { scale: '1' }], { duration: TIMING.openLead * 2, easing: 'ease-out' })

  // The gulp: starts before the item is all the way in, so the folder reacts to it arriving
  const gulpAt = TIMING.openLead + TIMING.swallow - TIMING.gulpOverlap
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
