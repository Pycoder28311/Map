import { describe, expect, it } from 'vitest'
import { deskLayout, pathOf, SPRITES, TONES } from './deskLayout'

const all = (desk: ReturnType<typeof deskLayout>) => [...desk.stars, ...desk.objects.flatMap((o) => [...o.ink, ...o.soft])]

describe('deskLayout', () => {
  it('is the same every time for the same size', () => {
    expect(deskLayout(120, 18)).toEqual(deskLayout(120, 18))
  })

  it('keeps everything inside the strip, the stars off the objects, and no pixel used twice', () => {
    const pixels = all(deskLayout(150, 18))
    for (const { x, y } of pixels) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(150)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(18)
    }
    expect(new Set(pixels.map(({ x, y }) => `${x},${y}`)).size).toBe(pixels.length)
    expect(pixels.length).toBeGreaterThan(0)
  })

  it('shows each of the three objects once, and the stars stay put when the strip grows', () => {
    const narrow = deskLayout(80, 30)
    const wide = deskLayout(200, 30)
    expect(SPRITES).toHaveLength(3)
    const count = (desk: ReturnType<typeof deskLayout>) => desk.objects.reduce((sum, o) => sum + o.ink.length + o.soft.length, 0)
    const sprite = SPRITES.map((s) => s.join('').replace(/\./g, '').length).reduce((a, b) => a + b)
    expect(count(wide)).toBe(sprite)
    expect(count(narrow)).toBe(sprite)
    const kept = (pixels: { x: number; y: number }[]) => pixels.filter(({ x }) => x < 60).map(({ x, y }) => `${x},${y}`)
    expect(kept(wide.stars).length).toBeGreaterThan(0)
    expect(wide.objects).toHaveLength(3)
  })

  it('turns each object a little, the same every time', () => {
    const { objects } = deskLayout(150, 30)
    for (const { angle } of objects) {
      expect(Math.abs(angle)).toBeGreaterThanOrEqual(4)
      expect(Math.abs(angle)).toBeLessThanOrEqual(9)
    }
    expect(deskLayout(150, 30).objects.map((o) => o.angle)).toEqual(objects.map((o) => o.angle))
  })

  it('has rectangular sprites made of known pixels only, ', () => {
    for (const sprite of SPRITES) {
      expect(new Set(sprite.map((line) => line.length)).size).toBe(1)
      expect(sprite.join('')).toMatch(new RegExp(`^[.${Object.keys(TONES).join('')}]+$`))
    }
    expect(SPRITES).toHaveLength(3)
  })

  it('makes one rectangle of each run of pixels', () => {
    expect(pathOf([{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 5, y: 0 }, { x: 0, y: 2 }])).toBe('M1 0h3v1h-3zM5 0h1v1h-1zM0 2h1v1h-1z')
  })
})
