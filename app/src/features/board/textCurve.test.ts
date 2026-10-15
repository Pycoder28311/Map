import { describe, expect, it } from 'vitest'
import { arcOf, placeOnArc, sagitta } from './textCurve'

describe('curved text', () => {
  it('makes a half circle at the most', () => {
    const { theta, radius } = arcOf(100, 200)
    expect(theta).toBeCloseTo(Math.PI)
    expect(radius).toBeCloseTo(200 / Math.PI)
    expect(arcOf(-250, 200).theta).toBeCloseTo(Math.PI)
  })

  it('has no bend when straight', () => {
    expect(sagitta(0, 300)).toBe(0)
  })

  it('bends a half circle by its radius', () => {
    expect(sagitta(100, 200)).toBeCloseTo(200 / Math.PI)
    expect(sagitta(-100, 200)).toBeCloseTo(200 / Math.PI)
    expect(sagitta(50, 200)).toBeLessThan(sagitta(100, 200))
  })

  it('keeps the middle of the baseline where it is, and turns the ends', () => {
    const middle = placeOnArc(60, 300, 20, 0)
    expect(middle.x).toBeCloseTo(150)
    expect(middle.y).toBeCloseTo(20)
    expect(middle.angle).toBe(0)
    const right = placeOnArc(60, 300, 20, 100)
    expect(right.angle).toBeGreaterThan(0)
    expect(right.y).toBeGreaterThan(20)
  })

  it('turns the other way and rises at the ends for a smile', () => {
    const right = placeOnArc(-60, 300, 20, 100)
    expect(right.angle).toBeLessThan(0)
    expect(right.y).toBeLessThan(20)
  })

  it('is symmetric about the middle', () => {
    const a = placeOnArc(70, 300, 10, -80)
    const b = placeOnArc(70, 300, 10, 80)
    expect(a.x + b.x).toBeCloseTo(300)
    expect(a.y).toBeCloseTo(b.y)
    expect(a.angle).toBeCloseTo(-b.angle)
  })
})
