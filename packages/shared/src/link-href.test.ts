import { isSafeLink } from './rich-text-policy'
import { sanitizeRichText } from './sanitize-html'
import { describe, expect, it } from 'vitest'
import { fromHref, toHref, withoutRule, withRule, type ArticleLink } from './link-href'

const LINKS: ArticleLink[] = [
  { kind: 'url', url: 'https://example.com/a?b=1&c=2#top' },
  { kind: 'url', url: 'https://example.com', rule: { id: 'r1', text: 'Athens' } },
  { kind: 'object', type: 'article', id: '12' },
  { kind: 'object', type: 'map', id: 'abc-9', rule: { id: 'r2', text: 'The map' } },
  { kind: 'msg', id: 42 },
  { kind: 'msg', id: null, legacy: { title: 'A "quote" & more', content: 'Line one\nLine two # 50% ✨ <b>no tags</b>' } },
  { kind: 'jump', to: 'a:x1y2z3' },
  { kind: 'jump', to: 'h:2:the-war', rule: { id: 'r3', text: 'war' } },
  { kind: 'anchor', id: 'x1y2z3' },
  { kind: 'person', personId: 'u3' },
  { kind: 'project-url', url: 'https://map.example.com/project/4' },
]

describe('toHref / fromHref', () => {
  it.each(LINKS)('round-trips %o', (link) => {
    expect(fromHref(toHref(link))).toEqual(link)
  })

  it('makes hrefs the server keeps as they are', () => {
    for (const link of LINKS) {
      const href = toHref(link)
      expect(isSafeLink(href)).toBe(true)
      const html = `<p><a href="${href.replace(/&/g, '&amp;')}">text</a></p>`
      const kept = sanitizeRichText(html)
      const back = /href="([^"]*)"/.exec(kept)?.[1]?.replace(/&amp;/g, '&')
      expect(back).toBe(href)
      expect(fromHref(back)).toEqual(link)
    }
  })

  it('refuses what is not ours or not right', () => {
    expect(fromHref('https://example.com')).toBeNull()
    expect(fromHref(null)).toBeNull()
    expect(fromHref('#mapl:k=nothing')).toBeNull()
    expect(fromHref('#mapl:k=url&u=javascript:alert(1)')).toBeNull()
    expect(fromHref('#mapl:k=url&u=ftp://example.com')).toBeNull()
    expect(fromHref('#mapl:k=object&ty=note&id=1')).toBeNull()
    expect(fromHref('#mapl:k=object&ty=article&id=a b')).toBeNull()
    expect(fromHref('#mapl:k=jump&to=x:1')).toBeNull()
    expect(fromHref(`#mapl:k=msg&ti=a&c=${'x'.repeat(2001)}`)).toBeNull()
    expect(fromHref('#mapl:k=msg')).toBeNull()
  })

  it('ignores keys it does not know, and a broken rule', () => {
    expect(fromHref('#mapl:k=anchor&id=a1&zz=9')).toEqual({ kind: 'anchor', id: 'a1' })
    expect(fromHref('#mapl:k=person&p=u1&a=bad id&t=x')).toEqual({ kind: 'person', personId: 'u1' })
  })
})

describe('withRule / withoutRule', () => {
  it('adds and removes the autolinker', () => {
    const link: ArticleLink = { kind: 'object', type: 'article', id: '1' }
    const ruled = withRule(link, { id: 'r', text: 'x' })
    expect(ruled).toEqual({ ...link, rule: { id: 'r', text: 'x' } })
    expect(withoutRule(ruled)).toEqual(link)
  })
  it('never puts one on a message', () => {
    const msg: ArticleLink = { kind: 'msg', id: 3 }
    expect(withRule(msg, { id: 'r', text: 'x' })).toBe(msg)
  })
})

describe('messages', () => {
  it('keeps only the id of a message', () => {
    expect(toHref({ kind: 'msg', id: 42 })).toBe('#mapl:k=msg&id=42')
  })
  it('reads an old message (title and text in the href) as legacy', () => {
    expect(fromHref('#mapl:k=msg&ti=Hi&c=There')).toEqual({ kind: 'msg', id: null, legacy: { title: 'Hi', content: 'There' } })
  })
  it('refuses ids that are not a row\'s', () => {
    for (const id of ['0', '-1', '1.5', 'abc', '1234567890123456']) expect(fromHref(`#mapl:k=msg&id=${id}`)).toBeNull()
  })
})
