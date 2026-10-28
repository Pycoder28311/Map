import { describe, expect, it } from 'vitest'
import { COMMON_SYMBOLS, SYMBOLS } from './symbols'

describe('the symbols', () => {
  const sections = SYMBOLS

  it('have sections with a title and no empty part', () => {
    for (const section of sections) {
      expect(section.title).not.toBe('')
      expect(section.symbols.split(' ').every((char) => char !== '')).toBe(true)
    }
  })

  it('are one character each, none twice in a section', () => {
    for (const section of sections) {
      const chars = section.symbols.split(' ')
      expect(chars.every((char) => [...char].length === 1)).toBe(true)
      expect(new Set(chars).size, section.title).toBe(chars.length)
    }
  })
})

describe('the common symbols', () => {
  it('are one character each, none twice', () => {
    const chars = COMMON_SYMBOLS.split(' ')
    expect(chars.every((char) => [...char].length === 1)).toBe(true)
    expect(new Set(chars).size).toBe(chars.length)
  })
})
