// Drag & drop effects of the tree, copied from the Zen sidebar reel (Portfolio:
// src/(pages)/zen-sidebar/config.js: TIMING, EASING, MOTION). Every number of the effects lives here.
// Durations in ms; lengths in px.

export const TIMING = {
  hover: 140,
  hoverOut: 200,
  /** A row leaving the ground under the cursor */
  lift: 200,
  /** Rows gliding to their new places after a drop */
  reflow: 340,
  /** A folder's children appearing */
  expand: 320,
  /** The chevron turning a quarter */
  chevron: 260,
  // The swallow: something dropped into a closed folder (or the trash)
  /** The lid comes up before the item arrives */
  openLead: 170,
  /** The item travelling in and shrinking away */
  swallow: 460,
  /** The folder's squash as it takes it */
  gulp: 320,
  /** The gulp starts before the item is all the way in */
  gulpOverlap: 150,
  /** The lid coming down again */
  closeBack: 240,
}

/** Cubic-bezier control points (the same four numbers CSS takes) */
export const EASING = {
  lift: [0.2, 1.3, 0.5, 1],
  reflow: [0.32, 0.9, 0.26, 1],
  expand: [0.22, 1, 0.28, 1],
  chevron: [0.65, 0, 0.35, 1],
  swallow: [0.55, 0, 0.85, 0.35],
  fade: [0.37, 0, 0.63, 1],
  spark: [0.16, 0.9, 0.3, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>

export const MOTION = {
  liftScale: 1.035,
  /** Degrees: just enough to read as "held" */
  liftTilt: 0.9,
  /** How far right a held row drifts from the column */
  dragNudge: 8,
  dragAlpha: 0.7,
  // The swallow
  swallowSpin: 10,
  swallowScale: 0.16,
  swallowArc: 0.55,
  swallowFadeFrom: 0.45,
  lidLift: 0.18,
  gulpSquash: 0.16,
  gulpSkew: 0.72,
  // Sparks
  sparkCount: 7,
  sparkReach: 18,
  sparkSpread: 2.1,
  sparkLag: 0.22,
  sparkSize: 2.3,
  sparkAlpha: 0.85,
  sparkFall: 6,
}

/** For CSS / WAAPI `easing` */
export const css = (curve: readonly [number, number, number, number]) => `cubic-bezier(${curve.join(',')})`

/** A cubic-bezier easing as a function (solved properly, like the reel's scene.js) */
export function bezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const at = (a: number, b: number, t: number) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3
  return (x: number) => {
    if (x <= 0) return 0
    if (x >= 1) return 1
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (at(x1, x2, mid) < x) lo = mid
      else hi = mid
    }
    return at(y1, y2, (lo + hi) / 2)
  }
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const mix = (a: number, b: number, t: number) => a + (b - a) * t

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
