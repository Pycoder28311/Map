import { describe, expect, it } from 'vitest'
import { crackedEdge } from './crackedEdge'

const deepPoints = (clip: string, depth: number) => clip.split(', ').filter((p) => p.split(' ').some((v) => parseFloat(v) >= depth * 0.4 && parseFloat(v) < depth + 0.1)).length

describe('crackedEdge', () => {
  it('is the same for the same seed and size', () => expect(crackedEdge('a', 300, 50, 4, 6)).toBe(crackedEdge('a', 300, 50, 4, 6)))
  it('is none without a size', () => expect(crackedEdge('a', 0, 50, 4, 6)).toBe('none'))
  it('stays inside the box', () => {
    for (const p of crackedEdge('b', 240, 48, 4, 6).replace(/^polygon\(|\)$/g, '').split(', ')) {
      const [x, y] = p.split(' ').map(parseFloat)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(240)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(48)
    }
  })
  it('a short side gets fewer cracks than a long one (the same density)', () => {
    // A square has cracks on every side; a strip 6 times wider than tall has hardly any on its ends
    expect(deepPoints(crackedEdge('c', 300, 300, 4, 6), 6)).toBeGreaterThan(deepPoints(crackedEdge('c', 300, 50, 4, 6), 6))
  })
})
