import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { DEFAULT_STYLE } from './style'
import { border, boardOf, line, pts, text } from './testing'
import { moveBy, resizeTo, rotateBy } from './operations'
import { boundsOf } from './bounds'
import type { TextObject } from './types'

const target = line(1, pts([0, 0], [100, 0]), { style: { ...DEFAULT_STYLE, thickness: 2 } })
const note = text(2, { anchor: { x: 10, y: 20 }, attach: 1 })
const board = boardOf(target, note)

const textAfter = (b: ReturnType<typeof boardOf>) => b.objects.find((o) => o.id === 2) as TextObject

describe('followChanges', () => {
  it('a text moves with what it is attached to', () => {
    const out = applyChange(board, moveBy([target], 30, 40)).board
    expect(textAfter(out).anchor).toEqual({ x: 40, y: 60 })
  })

  it('follows a resize by the displacement of the centre', () => {
    const out = applyChange(board, resizeTo([target], boundsOf(target), { x: 200, y: boundsOf(target).y + boundsOf(target).h }, false)).board
    expect(textAfter(out).anchor.x).toBeGreaterThan(10)
  })

  it('follows a rotation about another point', () => {
    const out = applyChange(board, rotateBy([target], { x: 0, y: 0 }, Math.PI / 2, false)).board
    expect(textAfter(out).anchor).not.toEqual({ x: 10, y: 20 })
  })

  it('does not move when something else changes, or when both move together', () => {
    const other = line(3, pts([0, 0], [5, 5]))
    const b = boardOf(target, note, other)
    expect(textAfter(applyChange(b, moveBy([other], 10, 10)).board).anchor).toEqual({ x: 10, y: 20 })
    const together = applyChange(b, moveBy([target, note], 30, 40)).board
    expect(textAfter(together).anchor).toEqual({ x: 40, y: 60 })
  })

  it('stops following a target that is removed', () => {
    const out = applyChange(board, { remove: [1] }).board
    expect(textAfter(out).attach).toBeUndefined()
  })

  it('is the same board when nothing is attached', () => {
    const plain = boardOf(target, text(2))
    const same = applyChange(plain, { update: [{ id: 9, patch: {} }] }).board
    expect(same).toBe(plain)
  })

  it('removing the name text clears the area name', () => {
    const area = border(1, pts([0, 0], [100, 0], [100, 100]), { name: 'Attica' })
    const nameText = text(2, { attach: 1, isName: true, text: 'Attica' })
    const out = applyChange(boardOf(area, nameText), { remove: [2] }).board
    expect(out.objects).toHaveLength(1)
    expect(out.objects[0].name).toBe('')
  })
})
