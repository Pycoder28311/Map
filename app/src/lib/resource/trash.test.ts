import { describe, expect, it, vi } from 'vitest'
import type { AnyResource } from '../../resources/types'
import { subscribeChanges, type ChangeEvent } from './changes'
import { emptyTrashSections, type TrashSection } from './trash'

function section(name: string, ids: number[], remove = vi.fn(async () => {})): TrashSection & { remove: typeof remove } {
  const resource = { name, api: { remove } } as unknown as AnyResource
  return { resource, items: ids.map((id) => ({ id })), more: false, remove }
}

describe('emptyTrashSections', () => {
  it('deletes every item, one by one, and tells the screens once per resource', async () => {
    const events: ChangeEvent[] = []
    const stop = subscribeChanges((e) => events.push(e))
    const a = section('notes', [1, 2])
    const b = section('posts', [7])
    await emptyTrashSections([a, b])
    stop()
    expect(a.remove.mock.calls).toEqual([[1], [2]])
    expect(b.remove.mock.calls).toEqual([[7]])
    expect(events).toEqual([{ name: 'notes' }, { name: 'posts' }])
  })

  it('stops at the first failure, keeps what was deleted, and still tells the screens', async () => {
    const events: ChangeEvent[] = []
    const stop = subscribeChanges((e) => events.push(e))
    let calls = 0
    const a = section('notes', [1, 2, 3], vi.fn(async () => {
      if (++calls === 2) throw new Error('boom')
    }))
    await expect(emptyTrashSections([a])).rejects.toThrow('boom')
    stop()
    expect(a.remove).toHaveBeenCalledTimes(2)
    expect(events).toEqual([{ name: 'notes' }])
  })

  it('does nothing for an empty Trash', async () => {
    const events: ChangeEvent[] = []
    const stop = subscribeChanges((e) => events.push(e))
    await emptyTrashSections([section('notes', [])])
    stop()
    expect(events).toEqual([])
  })
})
