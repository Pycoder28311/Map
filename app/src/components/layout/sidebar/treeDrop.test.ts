import { describe, expect, it } from 'vitest'
import { SEED_OBJECTS } from '../../../mocks/projects'
import { resolveDrop, rowDropPosition, type RowDropData } from './treeDrop'

const objects = SEED_OBJECTS
const row = (objectId: string, section: RowDropData['section'] = 'objects', extra: Partial<RowDropData> = {}): RowDropData => ({
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
  it('places an object before or after another', () => {
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'before')).toEqual({ kind: 'move', beforeId: 'm3' })
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'after')).toEqual({ kind: 'move', beforeId: 'm4' })
    // After the last object: to the end
    expect(resolveDrop(objects, [], 'm1', row('o2'), 'after')).toEqual({ kind: 'move', beforeId: null })
  })

  it('skips the dragged object and the archived ones when looking for what comes next', () => {
    expect(resolveDrop(objects, [], 'm4', row('m3'), 'after')).toEqual({ kind: 'move', beforeId: 'm5' })
    const archived = objects.map((o) => (o.id === 'm4' ? { ...o, archived: true } : o))
    expect(resolveDrop(archived, [], 'm1', row('m3'), 'after')).toEqual({ kind: 'move', beforeId: 'm5' })
  })

  it('refuses a drop into a row: nothing holds other objects', () => {
    expect(resolveDrop(objects, [], 'm1', row('m3'), 'into')).toBeNull()
  })

  it('moves an object to the end of Objects (the section header)', () => {
    expect(resolveDrop(objects, [], 'm1', { nodeId: 'objects-end', section: 'objects-end' }, 'after')).toEqual({ kind: 'move', beforeId: null })
  })

  it('never drops on Dashboard or on itself', () => {
    expect(resolveDrop(objects, [], 'm1', { nodeId: 'dashboard', section: 'fixed' }, 'before')).toBeNull()
    expect(resolveDrop(objects, [], 'm1', row('m1'), 'before')).toBeNull()
  })

  it('ignores something that is not a mock object (a note or a project from the server)', () => {
    expect(resolveDrop(objects, [], '5', row('m3'), 'before')).toBeNull()
  })

  it('pins and reorders pins', () => {
    expect(resolveDrop(objects, ['m3', 'o2'], 'm1', row('o2', 'pinned'), 'before')).toEqual({ kind: 'pin', beforeId: 'o2' })
    expect(resolveDrop(objects, ['m3', 'o2'], 'm3', row('o2', 'pinned'), 'after')).toEqual({ kind: 'pin', beforeId: null })
    expect(resolveDrop(objects, ['m3', 'o2'], 'o2', row('o2', 'pinned'), 'before')).toBeNull()
  })
})
