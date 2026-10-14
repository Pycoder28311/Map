import { POINT_DEFAULT } from './pointLabels'
import { describe, expect, it } from 'vitest'
import { canSelect, drawOrder } from './layers'
import { LAYER_BACKGROUND, LAYER_MAIN, type Board, type BoardObject } from './types'

const point = (id: number, layer: number): BoardObject => ({ id, kind: 'point', layer, name: '', links: [], anchor: { x: 0, y: 0 }, ...POINT_DEFAULT })

describe('layers', () => {
  it('draws by layer, then in list order', () => {
    const board: Board = { nextId: 5, objects: [point(1, LAYER_MAIN), point(2, LAYER_BACKGROUND), point(3, LAYER_MAIN), point(4, LAYER_BACKGROUND)] }
    expect(drawOrder(board).map((o) => o.id)).toEqual([2, 4, 1, 3])
    expect(board.objects.map((o) => o.id)).toEqual([1, 2, 3, 4])
  })

  it('does not let the background be selected', () => {
    expect(canSelect(point(1, LAYER_BACKGROUND))).toBe(false)
    expect(canSelect(point(1, LAYER_MAIN))).toBe(true)
  })
})
