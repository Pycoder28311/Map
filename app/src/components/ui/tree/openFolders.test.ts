import { describe, expect, it } from 'vitest'
import { withoutEmptyFolders } from './openFolders'
import type { TreeNode } from './types'

const node = (id: string, children?: TreeNode[]): TreeNode => ({ id, label: id, children })

describe('withoutEmptyFolders', () => {
  it('closes a folder that has no children now, at any depth, and keeps the others open', () => {
    const nodes = [node('a', [node('b', [node('c')]), node('d')]), node('e')]
    const open = new Set(['a', 'b', 'e', 'z'])
    expect([...withoutEmptyFolders(open, nodes)]).toEqual(['a', 'b', 'z'])
  })

  it('keeps a folder that is not among the nodes, and returns the same set when nothing closes', () => {
    const open = new Set(['a', 'gone'])
    expect(withoutEmptyFolders(open, [node('a', [node('b')])])).toBe(open)
    expect(withoutEmptyFolders(new Set(), [node('a')])).toEqual(new Set())
  })
})
