import { describe, expect, it } from 'vitest'
import { findMatches } from './find'
import { docOf, h, p } from './testing'

describe('findMatches', () => {
  it('finds every place, any case and accents, inside words too', () => {
    const doc = docOf(h(2, 'Café'), p('cafe and CAFÉS'), p({ text: 'café', code: true }))
    expect(findMatches(doc, 'cafe').map((m) => doc.textBetween(m.from, m.to))).toEqual(['Café', 'cafe', 'CAFÉ', 'café'])
  })
  it('nothing for an empty query, and at most max', () => {
    const doc = docOf(p('a a a a'))
    expect(findMatches(doc, ' ')).toEqual([])
    expect(findMatches(doc, 'a', 2)).toHaveLength(2)
  })
})
