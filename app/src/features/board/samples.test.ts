import { describe, expect, it } from 'vitest'
import { armSample, headSample, shapeSample, typeSample, waySample } from './samples'
import { DEFAULT_STYLE } from './style'
import { flattenedOf } from './pathGeometry'

describe('samples', () => {
  it('a type sample is a curve with the type', () => {
    const s = typeSample({ ...DEFAULT_STYLE, type: 'dashed', gap: 6, part: 8 }, 200, 40)
    expect(s.style.type).toBe('dashed')
    expect(flattenedOf(s).length).toBeGreaterThan(4)
  })

  it('each way looks different', () => {
    const counts = (['exact', 'rounded', 'straight', 'corners'] as const).map((w) => waySample(w, DEFAULT_STYLE, 120, 40).points.length)
    expect(counts[2]).toBe(2)
    expect(new Set(counts).size).toBeGreaterThan(2)
  })

  it('an arm has its arrow on the one side', () => {
    expect(armSample('start', DEFAULT_STYLE, 100, 30).style.arrow).toMatchObject({ start: true, end: false })
    expect(armSample('end', DEFAULT_STYLE, 100, 30).style.arrow).toMatchObject({ start: false, end: true })
  })

  it('a head sample uses the head', () => {
    expect(headSample(3, DEFAULT_STYLE, 60, 30).style.arrow.style).toBe(3)
  })

  it('a shape sample fits its button', () => {
    const s = shapeSample('star', 50, 50, 5)
    expect(s.box.w).toBeLessThan(50)
  })
})
