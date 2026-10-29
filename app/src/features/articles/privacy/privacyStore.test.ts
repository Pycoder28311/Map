import { describe, expect, it } from 'vitest'
import { normalizeAllowed, withRole } from './privacyStore'

describe('normalizeAllowed', () => {
  it('takes the old list of ids as readers, and keeps roles', () => {
    expect(normalizeAllowed(['u1', 'u2'])).toEqual([
      { id: 'u1', role: 'reader' },
      { id: 'u2', role: 'reader' },
    ])
    expect(normalizeAllowed([{ id: 'u1', role: 'editor' }, { id: 'u2', role: 'nonsense' }])).toEqual([
      { id: 'u1', role: 'editor' },
      { id: 'u2', role: 'reader' },
    ])
  })
  it('drops what is not a person, and doubles', () => {
    expect(normalizeAllowed('x')).toEqual([])
    expect(normalizeAllowed([1, null, { role: 'editor' }, 'u1', 'u1'])).toEqual([{ id: 'u1', role: 'reader' }])
  })
})

describe('withRole', () => {
  const start = [{ id: 'u1', role: 'reader' as const }]
  it('adds, changes and takes out', () => {
    expect(withRole(start, 'u2', 'editor')).toEqual([...start, { id: 'u2', role: 'editor' }])
    expect(withRole(start, 'u1', 'editor')).toEqual([{ id: 'u1', role: 'editor' }])
    expect(withRole(start, 'u1', null)).toEqual([])
    expect(withRole(start, 'u9', null)).toEqual(start)
  })
})
