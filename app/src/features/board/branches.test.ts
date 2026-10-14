import { describe, expect, it } from 'vitest'
import type { MockObject } from '../../mocks/projects'
import { branchList, nextBranchName, siblingMaps } from './branches'

const map = (id: string, extra: Partial<MockObject> = {}): MockObject => ({
  id, kind: 'map', name: id, parentId: 'p1', draggable: true, locked: true, archived: false, createdAt: Number(id.slice(1)), likes: 0, ...extra,
})

describe('branches', () => {
  it('a map without branches is a group of one', () => {
    expect(branchList([map('m1')], 'm1').map((o) => o.id)).toEqual(['m1'])
    expect(branchList([map('m1')], 'nope')).toEqual([])
  })
  it('lists the group in creation order from any of its maps, leaving others and the trash out', () => {
    const all = [map('m3', { branchOf: 'm1' }), map('m1', { branchOf: 'm1' }), map('m2', { branchOf: 'm1' }), map('m4'), map('m5', { branchOf: 'm1', archived: true })]
    expect(branchList(all, 'm3').map((o) => o.id)).toEqual(['m1', 'm2', 'm3'])
    expect(branchList(all, 'm2').map((o) => o.id)).toEqual(['m1', 'm2', 'm3'])
  })
  it('still lists the others when the first map is gone', () => {
    const all = [map('m2', { branchOf: 'm1' }), map('m3', { branchOf: 'm1' })]
    expect(branchList(all, 'm3').map((o) => o.id)).toEqual(['m2', 'm3'])
  })
  it('names the next branch without clashing', () => {
    expect(nextBranchName([map('m1')])).toBe('Branch 1')
    expect(nextBranchName([map('m1'), map('m2', { name: 'Branch 2' })])).toBe('Branch 3')
  })
  it("presents the project's maps in list order", () => {
    const all = [map('m1'), { ...map('n1'), kind: 'note' as const }, map('m2'), map('m3', { archived: true }), map('m4', { parentId: 'p2' })]
    expect(siblingMaps(all, 'm2').map((o) => o.id)).toEqual(['m1', 'm2'])
    expect(siblingMaps([map('m9', { parentId: null })], 'm9').map((o) => o.id)).toEqual(['m9'])
  })
})
