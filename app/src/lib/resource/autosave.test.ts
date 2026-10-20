import { describe, expect, it } from 'vitest'
import {
  clearDraft,
  clearUserDrafts,
  decideOnOpen,
  draftKey,
  dueAt,
  fitsKeepalive,
  IDLE_MS,
  MAX_WAIT_MS,
  readDraft,
  retryDelay,
  writeDraft,
  type DraftStorage,
} from './autosave'

class FakeStorage implements DraftStorage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null
  }
  getItem(key: string) {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.map.set(key, value)
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
}

describe('dueAt', () => {
  const t = { dirty: true, saving: false, firstChange: 1_000, lastChange: 1_000 }
  it('is the idle time after the last change', () => {
    expect(dueAt({ ...t, lastChange: 4_000 })).toBe(4_000 + IDLE_MS)
  })
  it('is never later than the max wait after the first change (continuous typing)', () => {
    expect(dueAt({ ...t, firstChange: 1_000, lastChange: 1_000 + MAX_WAIT_MS - 1_000 })).toBe(1_000 + MAX_WAIT_MS)
  })
  it('is nothing when nothing changed or a save is running', () => {
    expect(dueAt({ ...t, dirty: false })).toBeNull()
    expect(dueAt({ ...t, saving: true })).toBeNull()
  })
  it('takes other times', () => {
    expect(dueAt(t, 100, 1_000)).toBe(1_100)
  })
})

describe('retryDelay and keepalive', () => {
  it('backs off, up to a minute', () => {
    expect([0, 1, 2, 3, 10].map(retryDelay)).toEqual([5_000, 10_000, 20_000, 40_000, 60_000])
  })
  it('knows what fits a keepalive request', () => {
    expect(fitsKeepalive('a'.repeat(1_000))).toBe(true)
    expect(fitsKeepalive('a'.repeat(70_000))).toBe(false)
    // Counted in bytes: 25 000 Greek letters are 50 000 bytes, 40 000 are 80 000
    expect(fitsKeepalive('α'.repeat(25_000))).toBe(true)
    expect(fitsKeepalive('α'.repeat(40_000))).toBe(false)
  })
})

describe('drafts', () => {
  const key = draftKey('u1', 'notes', 5)
  const draft = { values: { title: 'a', content: '<p>b</p>' }, baseUpdatedAt: '2026-10-20T10:00:00.000Z', savedAt: 1 }

  it('builds a key per user, resource and item', () => {
    expect(key).toBe('map:draft:u1:notes:5')
  })
  it('writes, reads and clears', () => {
    const storage = new FakeStorage()
    writeDraft(storage, key, draft)
    expect(readDraft(storage, key)).toEqual(draft)
    clearDraft(storage, key)
    expect(readDraft(storage, key)).toBeNull()
  })
  it('reads nothing from a missing storage, a broken value or a throwing storage', () => {
    expect(readDraft(undefined, key)).toBeNull()
    const storage = new FakeStorage()
    storage.setItem(key, '{not json')
    expect(readDraft(storage, key)).toBeNull()
    storage.setItem(key, JSON.stringify({ values: 1 }))
    expect(readDraft(storage, key)).toBeNull()
    const throwing = { ...storage, getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('full') }, removeItem: () => { throw new Error('x') } } as unknown as DraftStorage
    expect(readDraft(throwing, key)).toBeNull()
    expect(() => writeDraft(throwing, key, draft)).not.toThrow()
    expect(() => clearDraft(throwing, key)).not.toThrow()
  })
  it('clears only one user\'s drafts', () => {
    const storage = new FakeStorage()
    writeDraft(storage, draftKey('u1', 'notes', 1), draft)
    writeDraft(storage, draftKey('u1', 'notes', 2), draft)
    writeDraft(storage, draftKey('u2', 'notes', 1), draft)
    storage.setItem('other', 'x')
    clearUserDrafts(storage, 'u1')
    expect(storage.length).toBe(2)
    expect(readDraft(storage, draftKey('u2', 'notes', 1))).toEqual(draft)
  })
})

describe('decideOnOpen', () => {
  const same = (a: { t: string }, b: { t: string }) => a.t === b.t
  const server = { updatedAt: 'B', values: { t: 'server' } }
  it('has nothing to do without a draft or with a draft equal to the server', () => {
    expect(decideOnOpen(null, server, same)).toBe('none')
    expect(decideOnOpen({ values: { t: 'server' }, baseUpdatedAt: 'A', savedAt: 0 }, server, same)).toBe('none')
  })
  it('applies a draft made on the server\'s current version', () => {
    expect(decideOnOpen({ values: { t: 'mine' }, baseUpdatedAt: 'B', savedAt: 0 }, server, same)).toBe('apply')
  })
  it('asks when the server changed since the draft', () => {
    expect(decideOnOpen({ values: { t: 'mine' }, baseUpdatedAt: 'A', savedAt: 0 }, server, same)).toBe('conflict')
  })
})
