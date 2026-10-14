import { describe, expect, it } from 'vitest'
import { snapshotRect, snapshotScale } from './snapshot'
import { boardOf, line, pts } from './testing'

describe('snapshotRect', () => {
  it('is the whole board when empty', () => {
    expect(snapshotRect(boardOf())).toEqual({ x: 0, y: 0, w: 1600, h: 1000 })
  })
  it('is the content with a margin', () => {
    const r = snapshotRect(boardOf(line(1, pts([200, 200], [300, 260]), { style: { ...line(0, []).style, thickness: 0 } })))
    expect(r).toEqual({ x: 160, y: 160, w: 180, h: 140 })
  })
  it('stays inside the board', () => {
    const r = snapshotRect(boardOf(line(1, pts([5, 5], [1595, 995]), { style: { ...line(0, []).style, thickness: 0 } })))
    expect(r).toEqual({ x: 0, y: 0, w: 1600, h: 1000 })
  })
})

describe('snapshotScale', () => {
  it('keeps the wanted scale when it fits and lowers it when it would be too big', () => {
    expect(snapshotScale({ x: 0, y: 0, w: 1000, h: 500 }, 2)).toBe(2)
    expect(snapshotScale({ x: 0, y: 0, w: 8192, h: 100 }, 2)).toBe(1)
  })
})
