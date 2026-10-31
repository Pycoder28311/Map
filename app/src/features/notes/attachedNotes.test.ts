import { describe, expect, it, vi } from 'vitest'

const update = vi.hoisted(() => vi.fn(async () => ({})))
// A localStorage in memory (before the stores read it)
const storage = vi.hoisted(() => {
  const data = new Map<string, string>()
  globalThis.localStorage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as Storage
  return data
})
vi.mock('../../lib/resource/hooks', () => ({ actionsOf: () => ({ update }), useResourceList: vi.fn() }))
vi.mock('../../resources/registry', () => ({ resourceByName: () => ({ name: 'notes' }) }))

const { attachFields, byNode, isAttachedTo, moveLocalNotes } = await import('./attachedNotes')
const { isNoteLinked, toggleNoteLink } = await import('../links/linkPick')

const note = (id: number, attachedType: string | null = null, attachedId: number | null = null, attachedNode: number | null = null) => ({ id, attachedType, attachedId, attachedNode })

describe('notes attached to one thing (docs/plans/38)', () => {
  it('says what a note is attached to: a map, one of its nodes, an article, or nothing', () => {
    expect(attachFields({ type: 'map', id: 3, node: 7 })).toEqual({ attachedType: 'map', attachedId: 3, attachedNode: 7 })
    expect(attachFields({ type: 'map', id: 3 })).toEqual({ attachedType: 'map', attachedId: 3, attachedNode: null })
    expect(attachFields({ type: 'article', id: 3 })).toEqual({ attachedType: 'article', attachedId: 3, attachedNode: null })
    expect(attachFields(null)).toEqual({ attachedType: null, attachedId: null, attachedNode: null })
    expect(isAttachedTo(note(1, 'map', 3, 7), { type: 'map', id: 3, node: 7 })).toBe(true)
    expect(isAttachedTo(note(1, 'map', 3, 7), { type: 'map', id: 3 })).toBe(false)
  })

  it('groups a map\'s notes by node, the map\'s own under null', () => {
    const groups = byNode([note(1, 'map', 3), note(2, 'map', 3, 7), note(3, 'map', 3, 7)])
    expect(groups.get(null)?.map((n) => n.id)).toEqual([1])
    expect(groups.get(7)?.map((n) => n.id)).toEqual([2, 3])
  })

  it('a note picked for a node is attached to it, and detached when it was that node\'s', async () => {
    expect(isNoteLinked('3', 7, note(1, 'map', 3, 7))).toBe(true)
    await toggleNoteLink('3', 7, note(1, 'article', 9))
    expect(update).toHaveBeenLastCalledWith(1, { attachedType: 'map', attachedId: 3, attachedNode: 7 })
    await toggleNoteLink('3', 7, note(1, 'map', 3, 7))
    expect(update).toHaveBeenLastCalledWith(1, { attachedType: null, attachedId: null, attachedNode: null })
  })

  it('moves the notes this device connected before, once', async () => {
    update.mockClear()
    storage.set('map:article-notes', JSON.stringify({ '5': ['11', '12'], '6': ['13'] }))
    await moveLocalNotes('article', 5)
    await moveLocalNotes('article', 5)
    expect(update.mock.calls).toEqual([
      ['11', { attachedType: 'article', attachedId: 5, attachedNode: null }],
      ['12', { attachedType: 'article', attachedId: 5, attachedNode: null }],
    ])
    expect(JSON.parse(storage.get('map:article-notes')!)).toEqual({ '6': ['13'] })
  })
})
