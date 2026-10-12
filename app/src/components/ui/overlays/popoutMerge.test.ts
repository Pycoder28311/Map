import { describe, expect, it } from 'vitest'
import { bridges, separate, shifted } from './popoutMerge'

const R = 16

describe('bridges', () => {
  it('leaves popouts apart alone', () => {
    expect(bridges([{ id: 'a', left: 0, right: 100, height: 50 }, { id: 'b', left: 140, right: 200, height: 80 }], R)).toEqual([])
  })

  it('joins nearly touching popouts at the shorter height, with a corner against the taller one', () => {
    expect(bridges([{ id: 'b', left: 120, right: 200, height: 80 }, { id: 'a', left: 0, right: 100, height: 50 }], R)).toEqual([
      { left: 84, right: 120, height: 50, ear: { left: 104, top: 50, side: 'right' } },
    ])
    expect(bridges([{ id: 'a', left: 0, right: 100, height: 90 }, { id: 'b', left: 110, right: 200, height: 40 }], R)).toEqual([
      { left: 100, right: 126, height: 40, ear: { left: 100, top: 40, side: 'left' } },
    ])
  })

  it('squares both inner corners when they are as tall', () => {
    expect(bridges([{ id: 'a', left: 0, right: 100, height: 60 }, { id: 'b', left: 100, right: 200, height: 60 }], R)).toEqual([
      { left: 84, right: 116, height: 60 },
    ])
  })

  it('skips overlapping ones', () => {
    expect(bridges([{ id: 'a', left: 0, right: 100, height: 60 }, { id: 'b', left: 90, right: 200, height: 60 }], R)).toEqual([])
  })
})

describe('separate', () => {
  it('moves a popout left until it meets the one on its right, which then join', () => {
    const spans = [
      { id: 'search', left: 100, right: 600, height: 300 },
      { id: 'share', left: 500, right: 800, height: 200 },
    ]
    const offsets = separate(spans)
    expect(offsets).toEqual({ share: 0, search: -100 })
    const moved = shifted(spans, offsets)
    expect(moved.find((s) => s.id === 'search')).toMatchObject({ left: 0, right: 500 })
    expect(bridges(moved, R)).toEqual([{ left: 500, right: 516, height: 200, ear: { left: 500, top: 200, side: 'left' } }])
  })

  it('leaves popouts that do not overlap where they are', () => {
    expect(separate([{ id: 'a', left: 0, right: 100, height: 10 }, { id: 'b', left: 120, right: 200, height: 10 }])).toEqual({ a: 0, b: 0 })
  })
})
