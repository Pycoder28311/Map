// Where a hover-info card goes. Pure (hoverInfoPosition.test.ts).
export type Side = 'top' | 'bottom' | 'left' | 'right'
type Box = { left: number; top: number; width: number; height: number }

export type HoverInfoPlace = {
  /** The side it ended up on (the wanted one, or the opposite when that doesn't fit) */
  side: Side
  /** The card's top-left corner (viewport px) */
  left: number
  top: number
  /** Where along its edge (px from the card's top / left) the arrow points at the anchor's centre */
  arrow: number
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

/**
 * The card beside `anchor` on `side` (a `gap` away), on the opposite side if it would leave the viewport,
 * and pushed back inside it (`margin` from the edges) along the other axis.
 */
export function hoverInfoPosition(
  anchor: Box,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  side: Side,
  gap = 10,
  margin = 8,
): HoverInfoPlace {
  const fits = (s: Side) => {
    if (s === 'right') return anchor.left + anchor.width + gap + card.width <= viewport.width - margin
    if (s === 'left') return anchor.left - gap - card.width >= margin
    if (s === 'bottom') return anchor.top + anchor.height + gap + card.height <= viewport.height - margin
    return anchor.top - gap - card.height >= margin
  }
  const placed = fits(side) || !fits(OPPOSITE[side]) ? side : OPPOSITE[side]
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(n, Math.max(min, max)))
  const centreX = anchor.left + anchor.width / 2
  const centreY = anchor.top + anchor.height / 2

  if (placed === 'left' || placed === 'right') {
    const left = placed === 'right' ? anchor.left + anchor.width + gap : anchor.left - gap - card.width
    const top = clamp(centreY - card.height / 2, margin, viewport.height - margin - card.height)
    return { side: placed, left, top, arrow: centreY - top }
  }
  const top = placed === 'bottom' ? anchor.top + anchor.height + gap : anchor.top - gap - card.height
  const left = clamp(centreX - card.width / 2, margin, viewport.width - margin - card.width)
  return { side: placed, left, top, arrow: centreX - left }
}
