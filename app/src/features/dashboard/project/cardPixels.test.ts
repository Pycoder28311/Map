import { describe, expect, it } from 'vitest'
import { ART_PALETTE, BOTTOM_GEM, CHALICE, CORNER_GEM, FRAME_LEFT, PALETTE, TOP_GEM } from './cardPixelData'
import { drawChalice, drawFrame, LAYOUT, SKINS, toPaths, type Canvas } from './cardPixels'
import { GOLD_ART_PALETTE, GOLD_CHALICE, GOLD_FRAME, GOLD_PALETTE } from './goldCardData'

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

  it.each(Object.keys(SKINS) as (keyof typeof SKINS)[])('%s: the silhouette is clean: its outer edge is outline all round (corners too), every outline pixel outlines something, nothing floats', (name) => {
    const frame: Canvas = SKINS[name].frame()
    const H = frame.length
    const W = frame[0].length
    const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < W && y < H ? frame[y][x] : null)
    // the see-through pixels joined to the card's edges: the outside
    const outside = new Set<string>()
    const stack: [number, number][] = []
    for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1])
    for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y])
    while (stack.length) {
      const [x, y] = stack.pop()!
      const key = `${x},${y}`
      if (x < 0 || y < 0 || x >= W || y >= H || outside.has(key) || frame[y][x] !== null) continue
      outside.add(key)
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    const steps = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    const around = [...steps, [1, 1], [1, -1], [-1, 1], [-1, -1]]
    const wrong: string[] = []
    frame.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c === null) return
        // touching the outside, even only at a corner: a gap in the outline otherwise
        const touchesOutside = around.some(([dx, dy]) => outside.has(`${x + dx},${y + dy}`))
        if (touchesOutside && c !== 'o') wrong.push(`${x},${y} is '${c}' on the outer edge (should be outline 'o')`)
        // an outline pixel of the outer edge with nothing coloured round it: a stub sticking out, outlining nothing
        if (touchesOutside && c === 'o' && !around.some(([dx, dy]) => ![null, 'o'].includes(at(x + dx, y + dy)))) wrong.push(`${x},${y} is a stub of outline`)
        if (steps.every(([dx, dy]) => at(x + dx, y + dy) === null)) wrong.push(`${x},${y} floats on its own`)
      }),
    )
    expect(wrong).toEqual([])
  })

  it('the gold card: rows of one length, only the letters of its palettes, the chalice the size of its window', () => {
    const goldLetters = new Set([...Object.keys(GOLD_PALETTE), '.'])
    const goldArt = new Set(Object.keys(GOLD_ART_PALETTE))
    expect(GOLD_FRAME).toHaveLength(SKINS.gold.height)
    for (const row of GOLD_FRAME) {
      expect(row).toHaveLength(SKINS.gold.width)
      for (const ch of row) expect(goldLetters.has(ch)).toBe(true)
    }
    expect(GOLD_CHALICE).toHaveLength(SKINS.gold.window.height)
    for (const row of GOLD_CHALICE) {
      expect(row).toHaveLength(SKINS.gold.window.width)
      for (const ch of row) expect(goldArt.has(ch)).toBe(true)
    }
  })

  it('the paths cover exactly the pixels drawn', () => {
    for (const [canvas, palette] of [
      [drawFrame(), PALETTE],
      [drawChalice(), ART_PALETTE],
      [SKINS.gold.frame(), GOLD_PALETTE],
      [SKINS.gold.chalice(), GOLD_ART_PALETTE],
    ] as const) {
      const drawn = canvas.flat().filter((c) => c !== null).length
      const area = toPaths(canvas, palette)
        .flatMap(({ d }) => [...d.matchAll(/h(\d+)v(\d+)/g)])
        .reduce((sum, m) => sum + Number(m[1]) * Number(m[2]), 0)
      expect(area).toBe(drawn)
    }
  })
})
