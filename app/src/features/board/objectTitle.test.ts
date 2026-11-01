import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { titleChange, titleOf } from './objectTitle'
import { DEFAULT_STYLE } from './style'
import type { Board, BoardObject } from './types'

const line: BoardObject = { id: 1, layer: 1, kind: 'line', name: '', links: [], style: DEFAULT_STYLE, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }
const area: BoardObject = { id: 2, layer: 1, kind: 'border', name: '', links: [], style: DEFAULT_STYLE, fill: null, description: '', points: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }] }
const shape: BoardObject = { id: 3, layer: 1, kind: 'shape', name: 'Old', links: [], style: DEFAULT_STYLE, shape: 'rect', box: { x: 0, y: 0, w: 1, h: 1 }, rotation: 0, param: 0, fill: null }
const start: Board = { nextId: 4, objects: [line, area, shape] }
const set = (board: Board, object: BoardObject, words: string) => applyChange(board, titleChange(object, board.objects, words)).board

describe('objectTitle', () => {
  it('a line\'s title is the text on it, an area\'s the text in it (its name too), a shape\'s its name', () => {
    let board = set(start, line, 'Route 66')
    expect(titleOf(line, board.objects)).toBe('Route 66')
    board = set(board, area, 'Hills')
    expect(titleOf(board.objects.find((o) => o.id === 2)!, board.objects)).toBe('Hills')
    expect(board.objects.find((o) => o.id === 2)?.name).toBe('Hills')
    board = set(board, shape, 'Park')
    expect(titleOf(board.objects.find((o) => o.id === 3)!, board.objects)).toBe('Park')
  })

  it('an empty title takes a line\'s text away', () => {
    const named = set(start, line, 'Route 66')
    expect(named.objects.some((o) => o.kind === 'text')).toBe(true)
    expect(set(named, line, '  ').objects.some((o) => o.kind === 'text')).toBe(false)
  })
})
