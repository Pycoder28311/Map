import { describe, expect, it } from 'vitest'
import { compareFor } from './order'

const sorted = (order: Parameters<typeof compareFor>[0], rows: { id: number; pinned?: boolean; position?: string }[]) => [...rows].sort(compareFor(order)).map((r) => r.id)

describe('compareFor', () => {
  it('pinned first, then position, then id (notes)', () => {
    const rows = [
      { id: 1, pinned: false, position: 'a1' },
      { id: 2, pinned: true, position: 'a5' },
      { id: 3, pinned: false, position: 'a1' },
      { id: 4, pinned: true, position: 'a1' },
      { id: 5, pinned: false, position: 'a0V' },
    ]
    expect(sorted({ pinned: true, position: true }, rows)).toEqual([4, 2, 5, 1, 3])
  })

  it('position only: by position, then id ascending', () => {
    expect(sorted({ position: true }, [{ id: 2, position: 'a1' }, { id: 1, position: 'a1' }, { id: 3, position: 'Zz' }])).toEqual([3, 1, 2])
  })

  it('pinned only: pinned first, newest first inside each group', () => {
    expect(sorted({ pinned: true }, [{ id: 1 }, { id: 2, pinned: true }, { id: 3 }, { id: 4, pinned: true }])).toEqual([4, 2, 3, 1])
  })

  it('neither: newest first', () => {
    expect(sorted({}, [{ id: 1 }, { id: 3 }, { id: 2 }])).toEqual([3, 2, 1])
  })
})
