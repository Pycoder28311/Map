import { describe, expect, it } from 'vitest'
import { pathOf, spaceLayout, SPRITES } from './spaceLayout'

describe('spaceLayout', () => {
  it('is the same every time for the same size', () => {
    expect(spaceLayout(120, 18)).toEqual(spaceLayout(120, 18))
  })

  it('keeps everything inside the sky, and the stars off the planets', () => {
    const { planets, stars } = spaceLayout(150, 18)
    for (const { x, y } of [...planets, ...stars]) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(150)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(18)
    }
    const used = new Set(planets.map(({ x, y }) => `${x},${y}`))
    expect(stars.some(({ x, y }) => used.has(`${x},${y}`))).toBe(false)
    expect(planets.length).toBeGreaterThan(0)
    expect(stars.length).toBeGreaterThan(5)
  })

  it('only adds to the right when the sky grows', () => {
    const narrow = spaceLayout(80, 18)
    const wide = spaceLayout(200, 18)
    const kept = (pixels: { x: number; y: number }[]) => pixels.filter(({ x }) => x < 60).map(({ x, y }) => `${x},${y}`).sort()
    expect(kept(wide.planets)).toEqual(kept(narrow.planets))
    expect(kept(wide.stars)).toEqual(kept(narrow.stars))
    expect(wide.planets.length).toBeGreaterThan(narrow.planets.length)
  })

  it('has rectangular sprites made of pixels only', () => {
    for (const sprite of SPRITES) {
      expect(new Set(sprite.map((line) => line.length)).size).toBe(1)
      expect(sprite.join('')).toMatch(/^[k.]+$/)
    }
  })

  it('makes one rectangle of each run of pixels', () => {
    expect(pathOf([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 2 }])).toBe('M1 0h3v1h-3zM5 0h1v1h-1zM0 2h1v1h-1z')
  })
})
