import { LAYER_BACKGROUND, type Board, type BoardObject } from './types'

/** The objects bottom to top: by layer, and in list order inside a layer (the sort is stable) */
export function drawOrder(board: Board): BoardObject[] {
  return [...board.objects].sort((a, b) => a.layer - b.layer)
}

/** The background layer can't be picked, moved or edited */
export const canSelect = (object: BoardObject) => object.layer !== LAYER_BACKGROUND
