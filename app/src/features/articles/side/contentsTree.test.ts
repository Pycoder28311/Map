import { describe, expect, it } from 'vitest'
import { jumpTargets } from '../links/jumpTargets'
import { docOf, h, p } from '../links/testing'
import { contentsTree, type ContentsNode } from './contentsTree'

const shape = (nodes: ContentsNode[]): unknown[] => nodes.map((n) => (n.children.length ? [n.heading.text, shape(n.children)] : n.heading.text))

describe('contentsTree', () => {
  it('nests a heading under the last higher one', () => {
    const doc = docOf(h(2, 'A'), h(3, 'A1'), h(3, 'A2'), h(2, 'B'), h(3, 'B1'), h(1, 'C'))
    expect(shape(contentsTree(jumpTargets(doc)))).toEqual([['A', ['A1', 'A2']], ['B', ['B1']], 'C'])
  })
  it('a first heading of a lower level is a root; anchors are left out', () => {
    const doc = docOf(h(3, 'x'), p({ text: 'here', link: { kind: 'anchor', id: 'a1' } }), h(2, 'y'))
    expect(shape(contentsTree(jumpTargets(doc)))).toEqual(['x', 'y'])
  })
})
