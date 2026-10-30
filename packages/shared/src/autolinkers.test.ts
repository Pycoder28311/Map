import { describe, expect, it } from 'vitest'
import { autolinkers, AUTOLINKERS_MAX, AUTOLINKER_PHRASES_MAX } from './autolinkers'
import { DATA } from './data.config'
import { toHref } from './link-href'

const rule = (id: string, phrases: string[], href = toHref({ kind: 'object', type: 'article', id: '12' })) => ({ id, phrases, link: href, by: 'u1' })

describe('autolinkers', () => {
  it('takes the five kinds of link an autolinker can make', () => {
    const links = [
      toHref({ kind: 'url', url: 'https://example.com' }),
      toHref({ kind: 'object', type: 'map', id: '3' }),
      toHref({ kind: 'jump', to: 'a:x1y2z3' }),
      toHref({ kind: 'person', personId: 'u3' }),
      toHref({ kind: 'project-url', url: 'https://example.com/p/1' }),
    ]
    expect(autolinkers.safeParse(links.map((l, i) => rule(`r${i}`, [`phrase ${i}`], l))).success).toBe(true)
  })

  it('refuses a link an autolinker cannot make: a message, an anchor, one with a rule, something else', () => {
    for (const href of [
      toHref({ kind: 'msg', id: 4 }),
      toHref({ kind: 'anchor', id: 'x1' }),
      toHref({ kind: 'object', type: 'article', id: '1', rule: { id: 'r', text: 'x' } }),
      'javascript:alert(1)',
      'https://example.com',
      '',
    ]) {
      expect(autolinkers.safeParse([rule('r1', ['a'], href)]).success).toBe(false)
    }
  })

  it('limits the number of autolinkers, of phrases, and their lengths', () => {
    const many = Array.from({ length: AUTOLINKERS_MAX + 1 }, (_, i) => rule(`r${i}`, [`p${i}`]))
    expect(autolinkers.safeParse(many.slice(0, AUTOLINKERS_MAX)).success).toBe(true)
    expect(autolinkers.safeParse(many).success).toBe(false)
    const phrases = Array.from({ length: AUTOLINKER_PHRASES_MAX + 1 }, (_, i) => `w${i}`)
    expect(autolinkers.safeParse([rule('r', phrases.slice(0, AUTOLINKER_PHRASES_MAX))]).success).toBe(true)
    expect(autolinkers.safeParse([rule('r', phrases)]).success).toBe(false)
    expect(autolinkers.safeParse([rule('r', ['x'.repeat(101)])]).success).toBe(false)
    expect(autolinkers.safeParse([rule('r', [])]).success).toBe(false)
    expect(autolinkers.safeParse([rule('r', ['  '])]).success).toBe(false)
  })

  it('a phrase belongs to one autolinker only, whatever its case or accents; ids are unique', () => {
    expect(autolinkers.safeParse([rule('a', ['Athens']), rule('b', ['athens'])]).success).toBe(false)
    expect(autolinkers.safeParse([rule('a', ['Ελλάδα']), rule('b', ['ελλαδα'])]).success).toBe(false)
    expect(autolinkers.safeParse([rule('a', ['one']), rule('a', ['two'])]).success).toBe(false)
    // (the same phrase twice in one autolinker is one phrase)
    expect(autolinkers.safeParse([rule('a', ['Athens', 'athens'])]).success).toBe(true)
  })

  it('an id is a word of letters, digits, - and _', () => {
    expect(autolinkers.safeParse([rule('bad id!', ['a'])]).success).toBe(false)
    expect(autolinkers.safeParse([rule('', ['a'])]).success).toBe(false)
  })
})

describe('articles.autolinkers', () => {
  it('is a field of the article, empty to start, and refused when it is not valid', () => {
    expect(DATA.articles.update.parse({ autolinkers: [rule('a', ['x'])] })).toEqual({ autolinkers: [rule('a', ['x'])] })
    expect(DATA.articles.update.safeParse({ autolinkers: [rule('a', ['x']), rule('b', ['X'])] }).success).toBe(false)
    expect(DATA.articles.fields.autolinkers.default).toEqual([])
  })
  it('is left out of lists and of a reader\'s copy', () => {
    expect(DATA.articles.omitFromLists).toEqual(['autolinkers'])
    expect(DATA.articles.editorFields).toEqual(['autolinkers'])
    expect((DATA.notes as { omitFromLists?: unknown }).omitFromLists).toBeUndefined()
  })
})
