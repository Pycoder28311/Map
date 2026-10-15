import { labelName } from './pointLabels'
import { LAYER_BACKGROUND, type Board, type BoardObject, type ObjectKind } from './types'

/** The objects bottom to top: by layer, and in list order inside a layer (the sort is stable) */
export function drawOrder(board: Board): BoardObject[] {
  return [...board.objects].sort((a, b) => a.layer - b.layer)
}

/** The background layer can't be picked, moved or edited */
export const canSelect = (object: BoardObject) => object.layer !== LAYER_BACKGROUND

/** What each kind is called in the list when it has no name of its own */
export const KIND_NAME: Record<ObjectKind, string> = { line: 'Line', border: 'Border', shape: 'Shape', text: 'Text', point: 'Point' }

/** The objects the layers list shows, top first (what is drawn last is on top); the background is left out */
export const layerList = (board: Board): BoardObject[] => drawOrder(board).filter(canSelect).reverse()

const firstLine = (text: string) => text.trim().split('\n')[0].slice(0, 40)

/** Its name in the list: its own, else what it says (a text) or is (a point's label, the name text of an area), else its kind */
export function layerLabel(object: BoardObject, board: Board): string {
  if (object.name.trim()) return object.name.trim()
  if (object.kind === 'text' && firstLine(object.text)) return firstLine(object.text)
  if (object.kind === 'point') return labelName(object.label)
  if (object.kind === 'border') {
    const name = board.objects.find((o) => o.kind === 'text' && o.isName && o.attach === object.id)
    if (name?.kind === 'text' && firstLine(name.text)) return firstLine(name.text)
  }
  return KIND_NAME[object.kind]
}
