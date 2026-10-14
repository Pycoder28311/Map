import { describe, expect, it } from 'vitest'
import { hoverInfoPosition } from './hoverInfoPosition'

const anchor = { left: 100, top: 100, width: 40, height: 40 }
const card = { width: 200, height: 80 }
const viewport = { width: 1000, height: 700 }

describe('hoverInfoPosition', () => {
  it('sits beside the anchor, centred on it, the arrow pointing at its middle', () => {
    const p = hoverInfoPosition(anchor, card, viewport, 'right')
    expect(p).toMatchObject({ side: 'right', left: 150, top: 80 })
    expect(p.arrow).toBe(40)
  })

  it('flips to the other side when it does not fit', () => {
    expect(hoverInfoPosition({ ...anchor, left: 900 }, card, viewport, 'right').side).toBe('left')
    expect(hoverInfoPosition({ ...anchor, top: 5 }, card, viewport, 'top').side).toBe('bottom')
  })

  it('keeps the wanted side when neither fits', () => {
    expect(hoverInfoPosition(anchor, { width: 2000, height: 80 }, viewport, 'right').side).toBe('right')
  })

  it('is pushed back inside the viewport along the other axis, the arrow still on the anchor', () => {
    const p = hoverInfoPosition({ ...anchor, top: 0 }, card, viewport, 'right')
    expect(p.top).toBe(8)
    expect(p.arrow).toBe(20 - 8)
    const q = hoverInfoPosition({ ...anchor, left: 990 }, card, viewport, 'bottom')
    expect(q.left).toBe(1000 - 8 - 200)
  })
})
