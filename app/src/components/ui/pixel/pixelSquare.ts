// The pixel square element type (PixelSquare.tsx): corners cut in steps of one pixel unit, and optionally a bevel inside (styles/pixelSquare.css).
// The size of ONE pixel unit is the CSS variable --pixel-square in styles/tokens.css (2px): every step of a corner and every edge of the bevel is
// one of it. How many steps a corner has is the `steps` argument (default PIXEL_STEPS). Pure (pixelSquare.test.ts).
import type { CSSProperties } from 'react'

/** Steps in each corner when not said (each is one pixel unit across and one down) */
export const PIXEL_STEPS = 2

const UNIT = 'var(--pixel-square)'
type Point = [number, number]

/** `k` pixel units from the left or top edge, or (`far`) from the right or bottom one */
const along = (k: number, far: boolean) => (k === 0 ? (far ? '100%' : '0px') : far ? `calc(100% - ${k} * ${UNIT})` : `calc(${k} * ${UNIT})`)

/**
 * The clip-path of a box with `steps` steps in each corner: a polygon going round it, each corner a staircase from one edge to the next
 * (steps 1: one pixel unit cut off the corner; 2: two steps; 0: the plain rectangle)
 */
export function pixelCorners(steps = PIXEL_STEPS): string {
  const n = Math.max(0, Math.floor(steps))
  if (n === 0) return 'none'
  // The top left corner, from the left edge to the top edge: (0,n) (1,n) (1,n-1) (2,n-1) … (n,1) (n,0)
  const corner: Point[] = []
  for (let i = 0; i < n; i++) corner.push([i, n - i], [i + 1, n - i])
  corner.push([n, 0])
  const reversed = [...corner].reverse()
  // Clockwise from the top left; `far` marks a coordinate measured from the right / bottom edge
  const point = ([x, y]: Point, farX: boolean, farY: boolean) => `${along(x, farX)} ${along(y, farY)}`
  const points = [
    ...corner.map((p) => point(p, false, false)),
    ...reversed.map((p) => point(p, true, false)),
    ...corner.map((p) => point(p, true, true)),
    ...reversed.map((p) => point(p, false, true)),
  ]
  return `polygon(${points.join(', ')})`
}

/** The class and style of a pixel square: `bevel`, the light and dark edges inside it; `steps`, the steps in each corner */
export function pixelSquare({ bevel = false, steps = PIXEL_STEPS }: { bevel?: boolean; steps?: number } = {}): { className: string; style: CSSProperties } {
  return { className: bevel ? 'pixel-bevel' : '', style: { clipPath: pixelCorners(steps) } }
}
