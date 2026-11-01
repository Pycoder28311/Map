// The title of a line, area or shape: the words of a line's text on it, of an area's text in it (its name too), or a shape's name. Every
// change of it goes through here, so the sidebar's text field and the article's left element agree. Pure (objectTitle.test.ts).
import { areaNameOf, nameArea, runsPatch, textChange } from './areaName'
import type { Change } from './changes'
import { nameTextOfLine, newLineNameText } from './lineName'
import { runsOf, type BoardObject } from './types'

const boardOf = (objects: BoardObject[]) => ({ nextId: 0, objects })

/** The text object that is the object's title (a line's, a closed area's), if it has one */
export function titleTextOf(object: BoardObject, board: BoardObject[]) {
  if (object.kind === 'line') return nameTextOfLine(board, object.id)
  if (object.kind === 'border' && !object.open) return areaNameOf(boardOf(board), object.id)
  return null
}

/** The object's title as it is now ('' for none) */
export function titleOf(object: BoardObject, board: BoardObject[]): string {
  if (object.kind === 'line' || (object.kind === 'border' && !object.open)) return titleTextOf(object, board)?.text ?? ''
  return object.name
}

/** The change that makes `words` the object's title (nothing: removes a line's or an area's text) */
export function titleChange(object: BoardObject, board: BoardObject[], words: string): Change {
  const next = words.trim()
  if (object.kind === 'border' && !object.open) return nameArea(boardOf(board), object.id, next)
  if (object.kind !== 'line') return { update: [{ id: object.id, patch: { name: next } }] }
  const text = nameTextOfLine(board, object.id)
  if (!text) return next ? { add: [newLineNameText(object, next)] } : {}
  if (next === '') return { remove: [text.id] }
  const { text: _first, ...marks } = runsOf(text)[0] ?? { text: '' }
  return textChange(text, runsPatch([{ ...marks, text: next }]))
}
