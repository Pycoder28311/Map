import { describe, expect, it } from 'vitest'
import { SYMBOL_GROUPS, SYMBOLS } from './symbols'

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

describe('the groups', () => {
  const grouped = SYMBOL_GROUPS.flatMap((g) => g.sections)

  it('hold every character of the sections', () => {
    const all = new Set(grouped.flatMap((s) => s.symbols.split(' ')))
    for (const section of SYMBOLS) for (const char of section.symbols.split(' ')) expect(all.has(char), `${section.title}: ${char}`).toBe(true)
  })

  it('have sections with one character each, none twice', () => {
    for (const section of grouped) {
      expect(section, 'a missing section').toBeDefined()
      const chars = section.symbols.split(' ')
      expect(chars.every((char) => [...char].length === 1)).toBe(true)
      expect(new Set(chars).size, section.title).toBe(chars.length)
    }
  })
})
