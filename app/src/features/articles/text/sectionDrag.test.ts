import { describe, expect, it } from 'vitest'
import { dropIndex, dropLineY } from './sectionDrag'

const rects = [
  { top: 0, bottom: 20 },
  { top: 24, bottom: 64 },
  { top: 68, bottom: 88 },
]

describe('dropping a section', () => {
  it('goes before the section whose middle is under the pointer', () => {
    expect(dropIndex(-5, rects)).toBe(0)
    expect(dropIndex(9, rects)).toBe(0)
    expect(dropIndex(11, rects)).toBe(1)
    expect(dropIndex(50, rects)).toBe(2)
    expect(dropIndex(200, rects)).toBe(3)
    expect(dropIndex(5, [])).toBe(0)
  })

  it('draws its line between two sections, or at an edge', () => {
    expect(dropLineY(0, rects)).toBe(0)
    expect(dropLineY(1, rects)).toBe(22)
    expect(dropLineY(3, rects)).toBe(88)
  })
})
