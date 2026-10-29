import { describe, expect, it } from 'vitest'
import { applyRule, longestFirst, occurrences, removeRule, ruleRanges, rulesFrom } from './autolink'
import { linkRanges } from './docLinks'
import type { ArticleLink } from './linkHref'
import { docOf, p, stateOf } from './testing'

const ATHENS: ArticleLink = { kind: 'object', type: 'article', id: '7' }
const rule = { id: 'r1', text: 'Athens', link: ATHENS }

describe('occurrences', () => {
  it('finds whole words, any case, any accents', () => {
    const doc = docOf(p('Athens and athens, ATHENS. Athensville is not. Áthens is.'))
    const words = occurrences(doc, 'athens').map((o) => doc.textBetween(o.from, o.to))
    expect(words).toEqual(['Athens', 'athens', 'ATHENS', 'Áthens'])
  })
  it('skips code and other links', () => {
    const doc = docOf(p({ text: 'Athens', code: true }, ' x ', { text: 'Athens', link: { kind: 'url', url: 'https://a.b' } }, ' Athens'))
    expect(occurrences(doc, 'Athens')).toHaveLength(1)
  })
  it('counts its own links as free', () => {
    const doc = docOf(p({ text: 'Athens', link: { ...ATHENS, rule: { id: 'r1', text: 'Athens' } } }))
    expect(occurrences(doc, 'Athens', 'r1')).toHaveLength(1)
    expect(occurrences(doc, 'Athens', 'r2')).toHaveLength(0)
  })
  it('finds words of more than one word, in each block', () => {
    const doc = docOf(p('The old town'), p('the Old Town again'))
    expect(occurrences(doc, 'old town')).toHaveLength(2)
  })
  it('finds nothing for an empty text', () => {
    expect(occurrences(docOf(p('a b')), '  ')).toEqual([])
  })
})

describe('applyRule / rulesFrom / removeRule', () => {
  it('links every place and reads the rule back', () => {
    const state = stateOf(p('Athens is old. Athens is big.'))
    const tr = state.tr
    expect(applyRule(tr, rule)).toBe(2)
    expect(rulesFrom(tr.doc)).toEqual([{ id: 'r1', phrases: ['Athens'], link: ATHENS, count: 2 }])
    expect(ruleRanges(tr.doc, 'r1').map((r) => r.text)).toEqual(['Athens', 'Athens'])
    // Again: nothing more to do
    expect(applyRule(tr, rule)).toBe(0)
  })
  it('only within the given ranges, and not the word being typed', () => {
    const state = stateOf(p('Athens Athens'))
    const tr = state.tr
    expect(applyRule(tr, rule, { within: [{ from: 8, to: 14 }], skipAt: 14 })).toBe(0)
    expect(applyRule(tr, rule, { within: [{ from: 8, to: 14 }] })).toBe(1)
  })
  it('a rule with more phrases: one id, all the phrases, the longest linked first', () => {
    const state = stateOf(p('The old town and the town, and Athens.'))
    const tr = state.tr
    for (const text of longestFirst(['town', 'old town', 'Athens'])) applyRule(tr, { id: 'r1', text, link: ATHENS })
    const [rule] = rulesFrom(tr.doc)
    expect(rulesFrom(tr.doc)).toHaveLength(1)
    expect(rule.phrases.sort()).toEqual(['Athens', 'old town', 'town'])
    expect(rule.count).toBe(3)
    expect(ruleRanges(tr.doc, 'r1').map((r) => r.text)).toEqual(['old town', 'town', 'Athens'])
    // Linking again changes nothing
    for (const text of ['town', 'old town', 'Athens']) expect(applyRule(tr, { id: 'r1', text, link: ATHENS })).toBe(0)
  })
  it('a changed rule replaces its links', () => {
    const state = stateOf(p('Athens'))
    const tr = state.tr
    applyRule(tr, rule)
    applyRule(tr, { ...rule, link: { kind: 'url', url: 'https://athens.gr' } })
    expect(rulesFrom(tr.doc)[0].link).toEqual({ kind: 'url', url: 'https://athens.gr' })
  })
  it('removing keeps the words', () => {
    const state = stateOf(p('Athens and Athens'))
    const tr = state.tr
    applyRule(tr, rule)
    expect(removeRule(tr, 'r1')).toBe(2)
    expect(linkRanges(tr.doc)).toEqual([])
    expect(tr.doc.textContent).toBe('Athens and Athens')
  })
})
