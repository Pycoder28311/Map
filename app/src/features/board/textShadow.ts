// A text's shadow: its blur (the Size in the sidebar) and how far it falls right (`shadowDistance`, the X offset) and down (`shadowY`).
// A text saved when the shadow had one distance has no `shadowY`: it fell as far down as right. Pure.

type Shadowed = { shadowBlur?: number; shadowDistance?: number; shadowY?: number }

/** How far the shadow falls right and down (negative: left and up) */
export const shadowOffset = (o: Shadowed) => {
  const x = o.shadowDistance ?? 0
  return { x, y: o.shadowY ?? x }
}

/** Whether there is a shadow to paint */
export const hasShadow = (o: Shadowed) => {
  const { x, y } = shadowOffset(o)
  return (o.shadowBlur ?? 0) > 0 || x !== 0 || y !== 0
}
