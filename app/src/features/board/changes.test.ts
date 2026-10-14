import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { DEFAULT_STYLE } from './style'
import { boardOf, line, pts } from './testing'

describe('applyChange', () => {
  const base = () => boardOf(line(1, pts([0, 0])), line(2, pts([5, 5]), { links: [{ to: 'board', id: 1 }, { to: 'sidebar', id: 'n1' }] }))

  it('updates, removes and adds at once, giving the new ids', () => {
    const { board, added } = applyChange(base(), {
      update: [{ id: 2, patch: { name: 'two' } }],
      remove: [1],
      add: [{ kind: 'line', name: 'new', links: [], style: DEFAULT_STYLE, points: pts([9, 9]) }],
    })
    expect(added).toEqual([3])
    expect(board.nextId).toBe(4)
    expect(board.objects.map((o) => [o.id, o.name])).toEqual([[2, 'two'], [3, 'new']])
  })

  it('drops links to removed objects', () => {
    const { board } = applyChange(base(), { remove: [1] })
    expect(board.objects[0].links).toEqual([{ to: 'sidebar', id: 'n1' }])
  })

  it('ignores id and kind in a patch, and updates of removed or unknown objects', () => {
    const { board } = applyChange(base(), { update: [{ id: 2, patch: { id: 99, kind: 'point' } as never }, { id: 1, patch: { name: 'x' } }], remove: [1] })
    expect(board.objects[0]).toMatchObject({ id: 2, kind: 'line' })
    expect(board.objects).toHaveLength(1)
  })

  it('is the same board when nothing changed', () => {
    const b = base()
    expect(applyChange(b, {}).board).toBe(b)
    expect(applyChange(b, { remove: [42], update: [{ id: 43, patch: { name: 'x' } }] }).board).toBe(b)
  })
})
