import { describe, expect, it } from 'vitest'
import { ARROW_HEADS, arrowHead, endTangents, headInset } from './arrows'
import { pts } from './testing'

describe('arrowHead', () => {
  it.each(ARROW_HEADS)('%s sits behind its tip, along the line', (head) => {
    const { parts } = arrowHead(head, { x: 100, y: 50 }, 0, 10)
    const all = parts.flat()
    expect(all.length).toBeGreaterThanOrEqual(2)
    for (const p of all) expect(p.x).toBeLessThanOrEqual(100.001)
  })

  it.each(['open', 'triangle', 'diamond', 'chevrons'] as const)('%s has its tip on the tip point', (head) => {
    const { parts } = arrowHead(head, { x: 100, y: 50 }, 0, 10)
    expect(parts.flat().some((p) => Math.abs(p.x - 100) < 1e-9 && Math.abs(p.y - 50) < 1e-9)).toBe(true)
  })

  it('is symmetric about the line', () => {
    const { parts } = arrowHead('triangle', { x: 0, y: 0 }, 0, 10)
    const [tip, a, b] = parts[0]
    expect(tip).toEqual({ x: 0, y: 0 })
    expect(a.y).toBeCloseTo(-b.y)
    expect(a.x).toBeCloseTo(b.x)
  })

  it('turns with the angle', () => {
    const { parts } = arrowHead('triangle', { x: 0, y: 0 }, Math.PI / 2, 10)
    expect(parts[0][1].y).toBeCloseTo(-10)
  })

  it('only filled heads cover the line end', () => {
    expect(headInset('open', 10)).toBe(0)
    expect(headInset('triangle', 10)).toBeGreaterThan(0)
  })
})

describe('endTangents', () => {
  it('points out of both ends', () => {
    const t = endTangents(pts([0, 0], [10, 0], [10, 10]))!
    expect(t.start).toBeCloseTo(Math.PI)
    expect(t.end).toBeCloseTo(Math.PI / 2)
  })

  it('has none for a dot', () => {
    expect(endTangents(pts([5, 5]))).toBeNull()
    expect(endTangents(pts([5, 5], [5, 5]))).toBeNull()
  })
})
