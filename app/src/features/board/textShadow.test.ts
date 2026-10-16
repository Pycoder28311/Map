import { describe, expect, it } from 'vitest'
import { hasShadow, shadowOffset } from './textShadow'

describe('text shadow', () => {
  it('falls as far down as right when only the distance was saved', () => {
    expect(shadowOffset({ shadowDistance: 3 })).toEqual({ x: 3, y: 3 })
  })
  it('has its own offsets, negative ones included', () => {
    expect(shadowOffset({ shadowDistance: -2, shadowY: 5 })).toEqual({ x: -2, y: 5 })
    expect(shadowOffset({ shadowDistance: 4, shadowY: 0 })).toEqual({ x: 4, y: 0 })
  })
  it('is there with a blur or any offset', () => {
    expect(hasShadow({})).toBe(false)
    expect(hasShadow({ shadowBlur: 2 })).toBe(true)
    expect(hasShadow({ shadowY: -1, shadowDistance: 0 })).toBe(true)
    expect(hasShadow({ shadowBlur: 0, shadowDistance: 0, shadowY: 0 })).toBe(false)
  })
})
