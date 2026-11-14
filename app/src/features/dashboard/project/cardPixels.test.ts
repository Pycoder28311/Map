import { describe, expect, it } from 'vitest'
import { ART_PALETTE, BOTTOM_GEM, CHALICE, CORNER_GEM, FRAME_LEFT, PALETTE, TOP_GEM } from './cardPixelData'
import { drawChalice, drawFrame, LAYOUT, toPaths } from './cardPixels'

const frameLetters = new Set([...Object.keys(PALETTE), '.'])
const artLetters = new Set([...Object.keys(ART_PALETTE), '.'])

describe('the article card pixel art', () => {
  it.each(Object.entries({ FRAME_LEFT, CORNER_GEM, TOP_GEM, BOTTOM_GEM }))('%s: rows of one length, only PALETTE letters', (_name, grid) => {
    expect(new Set(grid.map((row) => row.length)).size).toBe(1)
    for (const row of grid) for (const ch of row) expect(frameLetters.has(ch)).toBe(true)
  })

  it('CHALICE: rows of one length, only ART_PALETTE letters, the size of the window', () => {
    expect(CHALICE).toHaveLength(LAYOUT.window.height)
    for (const row of CHALICE) {
      expect(row).toHaveLength(LAYOUT.window.width)
      for (const ch of row) expect(artLetters.has(ch)).toBe(true)
    }
  })

  it('draws a frame of the layout size, mirrored, its window see-through', () => {
    const frame = drawFrame()
    expect(frame).toHaveLength(LAYOUT.height)
    expect(frame.every((row) => row.length === LAYOUT.width)).toBe(true)
    const { x, y, width, height } = LAYOUT.window
    expect(frame[y + Math.floor(height / 2)][x + Math.floor(width / 2)]).toBeNull()
    // the right half is the left half mirrored (below the gems)
    const row = frame[120]
    expect(row.slice(LAYOUT.width / 2)).toEqual(row.slice(0, LAYOUT.width / 2).reverse())
  })

  it('the paths cover exactly the pixels drawn', () => {
    for (const [canvas, palette] of [
      [drawFrame(), PALETTE],
      [drawChalice(), ART_PALETTE],
    ] as const) {
      const drawn = canvas.flat().filter((c) => c !== null).length
      const area = toPaths(canvas, palette)
        .flatMap(({ d }) => [...d.matchAll(/h(\d+)v(\d+)/g)])
        .reduce((sum, m) => sum + Number(m[1]) * Number(m[2]), 0)
      expect(area).toBe(drawn)
    }
  })
})
