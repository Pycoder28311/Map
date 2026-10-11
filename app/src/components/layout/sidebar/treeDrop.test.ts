import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS } from '../../../mocks/projects'
import { resolveDrop, rowDropPosition, type RowDropData } from './treeDrop'

const objects = SEED_OBJECTS
const row = (objectId: string, section: RowDropData['section'] = 'projects', extra: Partial<RowDropData> = {}): RowDropData => ({
  nodeId: objectId,
  section,
  objectId,
  ...extra,
})

describe('rowDropPosition', () => {
  const rect = { top: 100, height: 40 }
  it('splits a folder row into before / into / after', () => {
    expect(rowDropPosition(105, rect, true)).toBe('before')
    expect(rowDropPosition(120, rect, true)).toBe('into')
    expect(rowDropPosition(135, rect, true)).toBe('after')
  })
  it('has no middle band when it cannot take the drop', () => {
    expect(rowDropPosition(115, rect, false)).toBe('before')
    expect(rowDropPosition(125, rect, false)).toBe('after')
  })
})

describe('resolveDrop', () => {
  it('drops a map into an unlocked project (last)', () => {
    expect(resolveDrop(objects, [], 'm1', row('p2', 'projects', { folder: true }), 'into')).toEqual({
      kind: 'move',
      parentId: 'p2',
      beforeId: null,
      into: 'p2',
    })
  })

  it('refuses drops into locked objects and into projects for projects', () => {
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'into')).toBeNull()
    expect(resolveDrop(objects, [], 'p1', row('p2', 'projects', { folder: true }), 'into')).toBeNull()
  })

  it('places a map between siblings of another project', () => {
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'before')).toEqual({ kind: 'move', parentId: 'p2', beforeId: 'm3' })
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'after')).toEqual({ kind: 'move', parentId: 'p2', beforeId: 'm4' })
    expect(resolveDrop(objects, [], 'm1', row('m4'), 'after')).toEqual({ kind: 'move', parentId: 'p2', beforeId: null })
  })

  it('reorders projects among projects only', () => {
    expect(resolveDrop(objects, [], 'p3', row('p1'), 'before')).toEqual({ kind: 'move', parentId: null, beforeId: 'p1' })
    expect(resolveDrop(objects, [], 'p1', row('p2'), 'after')).toEqual({ kind: 'move', parentId: null, beforeId: 'p3' })
    expect(resolveDrop(objects, [], 'p1', row('m3'), 'before')).toBeNull()
    expect(resolveDrop(objects, [], 'm1', row('p2'), 'before')).toBeNull()
  })

  it('moves a map into Notes (parentless), next to a note or at the end', () => {
    expect(resolveDrop(objects, [], 'm1', row('n2', 'notes'), 'before')).toEqual({ kind: 'move', parentId: null, beforeId: 'n2' })
    expect(resolveDrop(objects, [], 'm1', { nodeId: 'notes-end', section: 'notes-end' }, 'after')).toEqual({
      kind: 'move',
      parentId: null,
      beforeId: null,
    })
    expect(resolveDrop(objects, [], 'p1', { nodeId: 'notes-end', section: 'notes-end' }, 'after')).toBeNull()
  })

  it('puts a child first in its project after the Overview row', () => {
    expect(resolveDrop(objects, [], 'n1', row('x', 'projects', { objectId: undefined, overviewOf: 'p1' }), 'after')).toEqual({
      kind: 'move',
      parentId: 'p1',
      beforeId: 'm1',
    })
    expect(resolveDrop(objects, [], 'n1', row('x', 'projects', { objectId: undefined, overviewOf: 'p1' }), 'before')).toBeNull()
  })

  it('never drops on Dashboard or on itself', () => {
    expect(resolveDrop(objects, [], 'm1', { nodeId: 'dashboard', section: 'fixed' }, 'before')).toBeNull()
    expect(resolveDrop(objects, [], 'm1', row('m1'), 'before')).toBeNull()
  })

  it('pins and reorders pins', () => {
    expect(resolveDrop(objects, ['m3', 'n2'], 'p1', row('n2', 'pinned'), 'before')).toEqual({ kind: 'pin', beforeId: 'n2' })
    expect(resolveDrop(objects, ['m3', 'n2'], 'm3', row('n2', 'pinned'), 'after')).toEqual({ kind: 'pin', beforeId: null })
    expect(resolveDrop(objects, ['m3', 'n2'], 'n2', row('n2', 'pinned'), 'before')).toBeNull()
  })
})
