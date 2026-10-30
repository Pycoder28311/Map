import { describe, expect, it } from 'vitest'
import { docOf, p } from '../links/testing'
import { legacyLinks } from './useLegacyMessages'

describe('legacyLinks', () => {
  it('finds each old message once, with every place it is on; new messages are not old', () => {
    const old = { kind: 'msg' as const, id: null, legacy: { title: 'Hi', content: 'There' } }
    const doc = docOf(p('a ', { text: 'one', link: old }, ' b ', { text: 'two', link: old }, ' ', { text: 'new', link: { kind: 'msg', id: 5 } }))
    const found = legacyLinks(doc)
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ title: 'Hi', content: 'There' })
    expect(found[0].places.map(({ from, to }) => doc.textBetween(from, to))).toEqual(['one', 'two'])
  })
})
