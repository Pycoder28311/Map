import { POINT_DEFAULT } from '../board/pointLabels'
import { describe, expect, it } from 'vitest'
import { PENCIL_STYLE } from '../board/style'
import { LAYER_MAIN, type Board } from '../board/types'
import { boardFromFile, boardToFile } from './compress'

describe('boardToFile', () => {
  it('is the board, brotli-compressed, and boardFromFile reads it back', async () => {
    const points = Array.from({ length: 200 }, (_, i) => ({ x: i * 3, y: 100 + (i % 7) }))
    const board: Board = {
      nextId: 3,
      objects: [
        { id: 1, kind: 'line', layer: LAYER_MAIN, name: 'Road', links: [], style: PENCIL_STYLE, points },
        { id: 2, kind: 'point', layer: LAYER_MAIN, name: '', links: [{ to: 'board', id: 1 }], anchor: { x: 5, y: 5 }, ...POINT_DEFAULT },
      ],
    }
    expect(await boardFromFile(await boardToFile(board))).toEqual(board)
  })
})
