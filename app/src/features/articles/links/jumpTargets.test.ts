import { describe, expect, it } from 'vitest'
import { jumpTargets, linkedTargets, resolveJump, slugOf } from './jumpTargets'
import { docOf, h, p } from './testing'

describe('slugOf', () => {
  it('makes a short key of the words', () => {
    expect(slugOf('The War (1821)')).toBe('the-war-1821')
    expect(slugOf('Café  Ñandú')).toBe('cafe-nandu')
    expect(slugOf('')).toBe('')
  })
})

describe('jumpTargets', () => {
  it('lists headings and anchors in order', () => {
    const doc = docOf(h(2, 'Start'), p('a ', { text: 'here', link: { kind: 'anchor', id: 'x1' } }), h(3, 'End'))
    expect(jumpTargets(doc).map((t) => [t.kind, t.to, t.text])).toEqual([
      ['heading', 'h:0:start', 'Start'],
      ['anchor', 'a:x1', 'here'],
      ['heading', 'h:1:end', 'End'],
    ])
  })
})

describe('resolveJump', () => {
  const doc = docOf(h(2, 'Life'), p('x'), h(2, 'Life'), p('y'), h(2, 'Death'))
  const indexOf = (to: string) => {
    const target = resolveJump(doc, to)
    return target?.kind === 'heading' ? target.index : null
  }
  it('finds a heading by its words, the nearest of the same', () => {
    expect(indexOf('h:1:life')).toBe(1)
    expect(indexOf('h:0:life')).toBe(0)
    // Moved: the words still find it
    expect(indexOf('h:0:death')).toBe(2)
  })
  it('is null when it is gone', () => {
    expect(resolveJump(doc, 'h:0:birth')).toBeNull()
    expect(resolveJump(doc, 'a:nope')).toBeNull()
  })
})

describe('linkedTargets', () => {
  it('counts the links to each target', () => {
    const doc = docOf(
      h(2, 'Life'),
      p({ text: 'one', link: { kind: 'jump', to: 'h:0:life' } }, ' ', { text: 'two', link: { kind: 'jump', to: 'h:0:life' } }),
      p({ text: 'gone', link: { kind: 'jump', to: 'a:zz' } }),
    )
    expect(linkedTargets(doc).map((t) => [t.target.to, t.count])).toEqual([['h:0:life', 2]])
  })
})
