import { describe, expect, it } from 'vitest'
import { allowedFrom, allowedOf, changesOf, initialsOf, permissionOf, withRole, withSwitch } from './sharing'

describe('withRole', () => {
  const start = [{ id: 'u1', role: 'reader' as const }]
  it('adds, changes and takes out', () => {
    expect(withRole(start, 'u2', 'editor')).toEqual([...start, { id: 'u2', role: 'editor' }])
    expect(withRole(start, 'u1', 'editor')).toEqual([{ id: 'u1', role: 'editor' }])
    expect(withRole(start, 'u1', null)).toEqual([])
    expect(withRole(start, 'u9', null)).toEqual(start)
  })
})

describe('permissions while editing', () => {
  const saved = [{ id: 'u1', role: 'reader' as const }, { id: 'u2', role: 'editor' as const }]

  it('reads a saved person as chosen, with the switches of their role', () => {
    expect(permissionOf(saved, 'u1')).toEqual({ on: true, read: true, edit: false })
    expect(permissionOf(saved, 'u2')).toEqual({ on: true, read: true, edit: true })
    expect(permissionOf(saved, 'u9')).toEqual({ on: false, read: false, edit: false })
  })

  it('the switches keep their rules', () => {
    const none = permissionOf(saved, 'u9')
    expect(withSwitch(none, { on: true })).toEqual({ on: true, read: true, edit: false })
    expect(withSwitch(none, { on: true, edit: true })).toEqual({ on: true, read: true, edit: true })
    expect(withSwitch(permissionOf(saved, 'u2'), { read: false })).toEqual({ on: true, read: false, edit: false })
    expect(withSwitch(permissionOf(saved, 'u1'), { edit: true })).toEqual({ on: true, read: true, edit: true })
    expect(withSwitch(permissionOf(saved, 'u2'), { on: false })).toEqual({ on: false, read: false, edit: false })
  })

  it('applies the edits to the saved list', () => {
    const next = allowedFrom(saved, {
      u1: { on: true, read: true, edit: true },
      u2: { on: false, read: false, edit: false },
      u3: { on: true, read: true, edit: false },
      u4: { on: true, read: false, edit: false },
    })
    expect(next).toEqual([
      { id: 'u1', role: 'editor' },
      { id: 'u3', role: 'reader' },
    ])
    expect(changesOf(saved, next)).toEqual({
      added: [{ id: 'u3', role: 'reader' }],
      changed: [{ id: 'u1', role: 'editor' }],
      removed: [{ id: 'u2', role: 'editor' }],
    })
  })

  it('no edits change nothing', () => {
    expect(allowedFrom(saved, {})).toEqual(saved)
  })
})

describe('people from the server', () => {
  it('takes the rights as the switches read them', () => {
    expect(allowedOf([{ id: 7, role: 'editor', user: { id: 'u1', name: 'Ann Lee', image: null } }])).toEqual([{ id: 'u1', role: 'editor' }])
  })
  it('makes initials, also of an empty name', () => {
    expect(initialsOf({ name: 'ann  lee smith' })).toBe('AL')
    expect(initialsOf({ name: '' })).toBe('?')
  })
})
