import { describe, expect, it } from 'vitest'
import { hueOf, placeholderArt } from './placeholderArt'

describe('placeholderArt', () => {
  it('is the same for one id', () => {
    expect(placeholderArt('a1')).toEqual(placeholderArt('a1'))
  })

  it('differs between ids, with hues in range', () => {
    const hues = ['a1', 'a2', 'a3', 'a4', 'o1'].map(hueOf)
    expect(new Set(hues).size).toBe(hues.length)
    for (const h of hues) expect(h >= 0 && h < 360).toBe(true)
  })
})
