/**
 * Where the floating copy goes so the pointer stays at the same spot of it: the grab point is kept as
 * a fraction of its width and height (so it holds when the copy changes shape between surfaces)
 */
export function floatPosition(pointer: { x: number; y: number }, grab: { fx: number; fy: number }, size: { width: number; height: number }) {
  return { left: pointer.x - grab.fx * size.width, top: pointer.y - grab.fy * size.height }
}

/** The grab point as a fraction of the grabbed element's box (clamped inside it) */
export function grabFraction(pointer: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }) {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  return {
    fx: rect.width ? clamp((pointer.x - rect.left) / rect.width) : 0.5,
    fy: rect.height ? clamp((pointer.y - rect.top) / rect.height) : 0.5,
  }
}
