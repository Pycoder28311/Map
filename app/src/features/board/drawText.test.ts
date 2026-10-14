import { describe, expect, it } from 'vitest'
import { areaToName, newText, textAt, textFromGesture } from './drawText'
import { getTextPen } from './pen'
import { border, boardOf, pts, text } from './testing'

const pen = getTextPen()

describe('textFromGesture', () => {
  it('a click makes text that grows as it is typed', () => {
    const t = textFromGesture({ x: 10.4, y: 20.6 }, { x: 12, y: 21 }, pen)
    expect(t.width).toBe(0)
    expect(t.anchor).toEqual({ x: 10, y: 21 })
    expect(t.text).toBe('')
  })

  it('a drag makes a box that wraps, whichever way it is dragged', () => {
    const t = textFromGesture({ x: 200, y: 100 }, { x: 100, y: 160 }, pen)
    expect(t.width).toBe(100)
    expect(t.anchor).toEqual({ x: 100, y: 100 })
  })

  it('takes the pen', () => {
    const t = newText({ x: 0, y: 0 }, 0, { size: 40, color: '#ff0000', align: 'center', opacity: 50 })
    expect(t).toMatchObject({ size: 40, color: '#ff0000', align: 'center', opacity: 50 })
  })
})

describe('textAt', () => {
  it('finds the text a click lands on', () => {
    const board = boardOf(text(1, { anchor: { x: 100, y: 100 }, width: 200 }))
    expect(textAt(board, { x: 150, y: 110 }, 2)?.id).toBe(1)
    expect(textAt(board, { x: 500, y: 500 }, 2)).toBeNull()
  })
})

describe('areaToName', () => {
  const square = pts([0, 0], [200, 0], [200, 200], [0, 200])

  it('an unnamed area under the click', () => {
    expect(areaToName(boardOf(border(1, square)), { x: 100, y: 100 })?.id).toBe(1)
  })

  it('not when it has a name, or a name text, or there is no area', () => {
    expect(areaToName(boardOf(border(1, square, { name: 'Attica' })), { x: 100, y: 100 })).toBeNull()
    expect(areaToName(boardOf(border(1, square), text(2, { attach: 1, isName: true })), { x: 100, y: 100 })).toBeNull()
    expect(areaToName(boardOf(border(1, square)), { x: 500, y: 500 })).toBeNull()
  })
})
