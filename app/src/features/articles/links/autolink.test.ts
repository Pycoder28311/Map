import { describe, expect, it } from 'vitest'
import { adoptRules, applyRule, fromStored, longestFirst, occurrences, removeRule, ruleRanges, rulesFrom, toStored, type AutoRule } from './autolink'
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

describe('the rules in the article\'s field', () => {
  const stored = [{ id: 'r1', phrases: ['Athens', 'Athina'], link: '#mapl:k=object&ty=article&id=7', by: 'u1' }]

  it('reads the field (as a value or as JSON text) and writes it back the same', () => {
    const rules = fromStored(stored)
    expect(rules).toEqual([{ id: 'r1', phrases: ['Athens', 'Athina'], link: ATHENS, by: 'u1', count: 0 }])
    expect(fromStored(JSON.stringify(stored))).toEqual(rules)
    expect(toStored(rules)).toEqual(stored)
  })

  it('leaves out what does not read: broken JSON, not a list, an entry whose link is not one', () => {
    expect(fromStored('not json')).toEqual([])
    expect(fromStored('{"a":1}')).toEqual([])
    expect(fromStored(undefined)).toEqual([])
    expect(fromStored([{ ...stored[0], link: 'javascript:alert(1)' }])).toEqual([])
  })

  it('takes a link\'s own rule keys off when it is stored', () => {
    const rules: AutoRule[] = [{ id: 'r2', phrases: ['x'], link: { ...ATHENS, rule: { id: 'r2', text: 'x' } }, by: '', count: 3 }]
    expect(toStored(rules)[0].link).toBe('#mapl:k=object&ty=article&id=7')
  })

  it('adopts the rules the text\'s links were made by and the field does not have, once', () => {
    const doc = docOf(
      p({ text: 'Athens', link: { ...ATHENS, rule: { id: 'r1', text: 'Athens' } } }, ' ', { text: 'Sparta', link: { kind: 'url', url: 'https://a.b', rule: { id: 'r9', text: 'Sparta' } } }),
    )
    const own = fromStored(stored)
    const adopted = adoptRules(own, doc, 'me')
    expect(adopted.map((r) => [r.id, r.by])).toEqual([
      ['r1', 'u1'],
      ['r9', 'me'],
    ])
    expect(adopted[1]).toMatchObject({ phrases: ['Sparta'], link: { kind: 'url', url: 'https://a.b' } })
    // Nothing to add: the same list, so nothing is saved
    expect(adoptRules(adopted, doc, 'me')).toBe(adopted)
    expect(adoptRules([], docOf(p('no links')), 'me')).toEqual([])
  })
})
