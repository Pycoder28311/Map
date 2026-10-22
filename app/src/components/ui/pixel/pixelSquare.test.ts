import { describe, expect, it } from 'vitest'
import { pixelCorners, pixelSquare } from './pixelSquare'

describe('pixelCorners', () => {
  it('is no clipping with no steps', () => {
    expect(pixelCorners(0)).toBe('none')
  })

  it('cuts one pixel unit off each corner with one step', () => {
    const clip = pixelCorners(1)
    // top left corner: from the left edge, one unit down, to one unit in on the top edge
    expect(clip).toContain('polygon(0px calc(1 * var(--pixel-square)), calc(1 * var(--pixel-square)) calc(1 * var(--pixel-square)), calc(1 * var(--pixel-square)) 0px')
    expect(clip.split(', ')).toHaveLength(12)
  })

  it('has a staircase of the given number of steps in each corner', () => {
    // each corner: 2 points per step and the one on the next edge; four corners
    expect(pixelCorners(2).split(', ')).toHaveLength(4 * (2 * 2 + 1))
    expect(pixelCorners(3).split(', ')).toHaveLength(4 * (2 * 3 + 1))
  })

  it('reaches the far edges from the right and the bottom', () => {
    const clip = pixelCorners(2)
    expect(clip).toContain('100% calc(2 * var(--pixel-square))')
    expect(clip).toContain('calc(100% - 2 * var(--pixel-square)) 100%')
  })
})

describe('pixelSquare', () => {
  it('gives the bevel class only when asked', () => {
    expect(pixelSquare().className).toBe('')
    expect(pixelSquare({ bevel: true }).className).toBe('pixel-bevel')
  })

  it('clips with the steps asked (two by default)', () => {
    expect(pixelSquare().style.clipPath).toBe(pixelCorners(2))
    expect(pixelSquare({ steps: 3 }).style.clipPath).toBe(pixelCorners(3))
  })
})
