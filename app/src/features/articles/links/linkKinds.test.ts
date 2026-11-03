import { describe, expect, it } from 'vitest'
import { AUTOLINK_KINDS, LINK_KINDS } from './linkKinds'

describe('linkKinds', () => {
  it('shows the links row in its order, and the Autolinker the same kinds but Message', () => {
    expect(LINK_KINDS.map((k) => k.id)).toEqual(['url', 'object', 'jump', 'follow', 'msg'])
    expect(AUTOLINK_KINDS.map((k) => k.id)).toEqual(['url', 'object', 'jump', 'follow'])
    // Every kind but Link has a search in the Autolinker
    expect(AUTOLINK_KINDS.filter((k) => k.searchable).map((k) => k.id)).toEqual(['object', 'jump', 'follow'])
  })
})
