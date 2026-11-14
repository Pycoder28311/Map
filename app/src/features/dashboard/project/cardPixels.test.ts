import { describe, expect, it } from 'vitest'
import { BAND, BOTTOM_GEM, CROSS, drawCard, KNOT, LAYOUT, PALETTE, PLAQUE_BORDER, STAR, STUD, TOP_GEM, toPaths } from './cardPixels'

const PIECES = { STAR, TOP_GEM, BOTTOM_GEM, KNOT, STUD, CROSS }
const letters = new Set([...Object.keys(PALETTE), '.'])

describe('the article card pixel art', () => {
  it.each(Object.entries(PIECES))('%s: rows of one length, only palette letters', (_name, piece) => {
    expect(new Set(piece.map((row) => row.length)).size).toBe(1)
    for (const row of piece) for (const ch of row) expect(letters.has(ch)).toBe(true)
  })

  it('the band and the plaque border use palette colours', () => {
    for (const c of [...BAND, ...PLAQUE_BORDER]) expect(c in PALETTE).toBe(true)
  })

  it('draws a card of the layout size, its window see-through in the middle', () => {
    const canvas = drawCard()
    expect(canvas).toHaveLength(LAYOUT.height)
    expect(canvas.every((row) => row.length === LAYOUT.width)).toBe(true)
    const { x, y, width, height } = LAYOUT.window
    expect(canvas[y + Math.floor(height / 2)][x + Math.floor(width / 2)]).toBeNull()
    // the gems are on the frame's top and bottom edges, in the middle
    expect(canvas[2][LAYOUT.width / 2 - 1]).not.toBeNull()
    expect(canvas[LAYOUT.height - 3][LAYOUT.width / 2 - 1]).not.toBeNull()
  })

  it('the paths cover exactly the pixels drawn', () => {
    const canvas = drawCard()
    const drawn = canvas.flat().filter((c) => c !== null).length
    const area = toPaths(canvas)
      .flatMap(({ d }) => [...d.matchAll(/h(\d+)v(\d+)/g)])
      .reduce((sum, m) => sum + Number(m[1]) * Number(m[2]), 0)
    expect(area).toBe(drawn)
  })
})
