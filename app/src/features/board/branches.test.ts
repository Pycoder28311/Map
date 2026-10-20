import { describe, expect, it } from 'vitest'
import type { MapItem } from '../maps/maps'
import { branchList, mapTree, nextBranchName, siblingMaps } from './branches'

const map = (id: number, extra: Partial<MapItem> = {}): MapItem => ({
  id,
  title: `m${id}`,
  branchOf: 0,
  archived: false,
  pinned: false,
  position: 0,
  createdAt: new Date(Date.UTC(2026, 0, id)).toISOString(),
  ...extra,
})
const ids = (list: MapItem[]) => list.map((m) => m.id)

describe('branches', () => {
  it('a map without branches is a group of one', () => {
    expect(ids(branchList([map(1)], '1'))).toEqual([1])
    expect(branchList([map(1)], '9')).toEqual([])
  })
  it('lists the group in creation order from any of its maps, leaving others and the trash out', () => {
    const all = [map(3, { branchOf: 1 }), map(1, { branchOf: 1 }), map(2, { branchOf: 1 }), map(4), map(5, { branchOf: 1, archived: true })]
    expect(ids(branchList(all, '3'))).toEqual([1, 2, 3])
    expect(ids(branchList(all, '2'))).toEqual([1, 2, 3])
  })
  it('still lists the others when the first map is gone', () => {
    const all = [map(2, { branchOf: 1 }), map(3, { branchOf: 1 })]
    expect(ids(branchList(all, '3'))).toEqual([2, 3])
  })
  it('names the next branch without clashing', () => {
    expect(nextBranchName([map(1)])).toBe('Branch 1')
    expect(nextBranchName([map(1), map(2, { title: 'Branch 2' })])).toBe('Branch 3')
  })
  it('presents the live maps in list order', () => {
    const all = [map(1), map(2), map(3, { archived: true }), map(4)]
    expect(ids(siblingMaps(all, '2'))).toEqual([1, 2, 4])
    expect(siblingMaps(all, '3')).toEqual([])
    expect(siblingMaps(all, '9')).toEqual([])
  })
  it('makes a tree of branch groups', () => {
    const tree = mapTree([map(1, { branchOf: 1 }), map(2), map(3, { branchOf: 1 })])
    expect(tree.map((n) => [n.map.id, ids(n.branches)])).toEqual([
      [1, [3]],
      [2, []],
    ])
  })
})
