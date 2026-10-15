import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { LINE_NAME_WORDS, midOf, midpointOf, nameTextOfLine, newLineNameText, placeOnSide, sideOf } from './lineName'
import { boardOf, line, pts } from './testing'
import { textBox } from './bounds'
import type { TextObject } from './types'

describe('midpointOf', () => {
  it('is half way along by length, not by point count', () => {
    expect(midpointOf(pts([0, 0], [10, 0], [110, 0]))).toEqual({ x: 55, y: 0 })
    expect(midpointOf(pts([0, 0], [0, 100]))).toEqual({ x: 0, y: 50 })
  })
})

describe('midOf', () => {
  it('gives the direction of the line there, read left to right', () => {
    expect(midOf(pts([0, 0], [100, 100])).angle).toBeCloseTo(45)
    expect(midOf(pts([100, 100], [0, 0])).angle).toBeCloseTo(45)
    expect(midOf(pts([0, 100], [100, 0])).angle).toBeCloseTo(-45)
    expect(midOf(pts([0, 0], [100, 0])).angle).toBe(0)
  })
})

describe('newLineNameText', () => {
  const l = line(1, pts([0, 100], [200, 100]))
  it('is tied to the line, with a link to it', () => {
    const t = newLineNameText(l)
    expect(t.attach).toBe(1)
    expect(t.links).toEqual([{ to: 'board', id: 1 }])
    expect(t.text).toBe(LINE_NAME_WORDS)
  })
  it('sits above the middle of the line, centred on it', () => {
    const b = applyChange(boardOf(l), { add: [newLineNameText(l)] }).board
    const t = nameTextOfLine(b.objects, 1) as TextObject
    expect(t).not.toBeNull()
    expect(t.anchor.y).toBeLessThan(100)
    // The box is centred on x = 100 (its anchor is left of it)
    expect(t.anchor.x).toBeLessThan(100)
  })
  it('is turned along a slanted line, with its box on the upper side', () => {
    const slanted = line(2, pts([0, 200], [200, 0]))
    const t = newLineNameText(slanted)
    expect(t.rotation).toBe(-45)
    // The line passes through (100, 100); the box centre is up and to the left of it
    const box = textBox({ ...t, id: 0 } as TextObject)
    expect(t.anchor.x + box.w / 2).toBeLessThan(100)
    expect(t.anchor.y + box.h / 2).toBeLessThan(100)
  })
  it('finds no name on a line that has none', () => {
    expect(nameTextOfLine(boardOf(l).objects, 1)).toBeNull()
  })
})

describe('sides', () => {
  const l = line(1, pts([0, 100], [200, 100]))
  const made = () => ({ ...newLineNameText(l), id: 9 }) as TextObject
  it('starts above, and the other side is mirrored across the line', () => {
    const above = made()
    expect(sideOf(l, above)).toBe('above')
    const below = { ...above, ...placeOnSide(l, above, 'below') }
    expect(sideOf(l, below)).toBe('below')
    const box = textBox(above)
    const a = above.anchor.y + box.h / 2
    const b = below.anchor.y + box.h / 2
    expect(Math.abs(a + b - 200)).toBeLessThanOrEqual(1)
    expect(placeOnSide(l, below, 'above').anchor).toEqual(above.anchor)
  })
  it('works on a slanted line too', () => {
    const slanted = line(2, pts([0, 200], [200, 0]))
    const t = { ...newLineNameText(slanted), id: 9 } as TextObject
    expect(sideOf(slanted, t)).toBe('above')
    expect(sideOf(slanted, { ...t, ...placeOnSide(slanted, t, 'below') })).toBe('below')
  })
})
