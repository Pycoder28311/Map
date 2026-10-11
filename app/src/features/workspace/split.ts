import { useSyncExternalStore } from 'react'

/**
 * Position of the vertical (x) and horizontal (y) resize lines, as fractions of the workspace. In a
 * 2×2 layout one line's halves can differ: `x2` = the bottom row's vertical line (x: the top row's),
 * `y2` = the right column's horizontal line (y: the left column's). At most one of them; missing =
 * the halves are joined (layout.ts: splitFor)
 */
export type Split = { x: number; y: number; x2?: number; y2?: number }

const KEY = 'workspace:split'
const DEFAULT: Split = { x: 0.5, y: 0.5 }
export const MIN = 0.2
export const MAX = 0.8

export const clamp = (value: number) => Math.min(MAX, Math.max(MIN, value))
export const percent = (value: number) => `${(value * 100).toFixed(2)}%`

function load(): Split {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Split> | null
    if (typeof saved?.x === 'number' && typeof saved?.y === 'number') return clampSplit(saved as Split)
  } catch {
    // unavailable or corrupt storage: use the default
  }
  return DEFAULT
}

// One value for the whole app (the workspace resizes it; opening a saved layout sets it)
let current: Split | null = null
const listeners = new Set<() => void>()

export const getSplit = () => (current ??= load())

/** Every line within MIN–MAX (the optional halves only when present) */
export function clampSplit({ x, y, x2, y2 }: Split): Split {
  return {
    x: clamp(x),
    y: clamp(y),
    ...(typeof x2 === 'number' ? { x2: clamp(x2) } : {}),
    ...(typeof y2 === 'number' ? { y2: clamp(y2) } : {}),
  }
}

/** Sets the sizes (clamped) and remembers them */
export function setSplit(next: Split) {
  current = clampSplit(next)
  listeners.forEach((listener) => listener())
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // private mode or full storage: sizes just aren't remembered
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Sizes kept in localStorage (not in the URL: they change on every mouse move), shared app-wide */
export function useSplit() {
  const split = useSyncExternalStore(subscribe, getSplit)
  return [split, setSplit] as const
}
