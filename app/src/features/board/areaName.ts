// An area's name is a text object attached to it (and `border.name` says the same words). All writes go through here,
// so the two never drift. Pure (areaName.test.ts).
import { textBox } from './bounds'
import { labelPoint } from './borders'
import type { Change, Draft, Patch } from './changes'
import { nameTextOf } from './follow'
import { flattenedOf } from './pathGeometry'
import { areaOf } from './polygon'
import { TEXT_DEFAULT } from './textDefaults'
import { textFields } from './textRuns'
import { LAYER_MAIN, type Board, type BorderObject, type TextObject } from './types'

export { nameTextOf as areaNameOf }

/** The font size an area's name gets: grows with the area (as the label of plan 20 did) */
export const nameSizeOf = (border: BorderObject) => Math.round(Math.min(28, Math.max(10, Math.sqrt(areaOf(flattenedOf(border))) / 7)))

/** A new name text for the area, centred on where its name goes (not in the board yet) */
export function newNameText(border: BorderObject, words: string): Draft & { kind: 'text' } {
  const draft: Draft & { kind: 'text' } = {
    kind: 'text',
    layer: LAYER_MAIN,
    name: '',
    links: [{ to: 'board', id: border.id }],
    anchor: { x: 0, y: 0 },
    text: words,
    ...TEXT_DEFAULT,
    align: 'center',
    size: nameSizeOf(border),
    color: border.style.color,
    attach: border.id,
    isName: true,
  }
  const at = labelPoint(flattenedOf(border))
  const box = textBox({ ...draft, id: 0 } as TextObject)
  return { ...draft, anchor: { x: Math.round(at.x - box.w / 2), y: Math.round(at.y - box.h / 2) } }
}

/** Naming (or renaming, or un-naming with an empty name) an area: its text and its `name` change together */
export function nameArea(board: Board, borderId: number, name: string): Change {
  const border = board.objects.find((o): o is BorderObject => o.id === borderId && o.kind === 'border')
  if (!border) return {}
  const words = name.trim()
  const existing = nameTextOf(board, borderId)
  if (words === '') return { update: [{ id: borderId, patch: { name: '' } }], ...(existing ? { remove: [existing.id] } : {}) }
  if (!existing) return { update: [{ id: borderId, patch: { name: words } }], add: [newNameText(border, words)] }
  return {
    update: [
      { id: existing.id, patch: { text: words, runs: undefined } },
      { id: borderId, patch: { name: words } },
    ],
  }
}

/** A change to a text object; when it is an area's name, the area's `name` follows (an emptied name text goes) */
export function textChange(text: TextObject, patch: Patch): Change {
  const touchesWords = 'text' in patch || 'runs' in patch
  if (!text.isName || text.attach === undefined || !touchesWords) return { update: [{ id: text.id, patch }] }
  const words = ((patch as { text?: string }).text ?? text.text).trim()
  if (words === '') return { update: [{ id: text.attach, patch: { name: '' } }], remove: [text.id] }
  return { update: [{ id: text.id, patch }, { id: text.attach, patch: { name: words } }] }
}

/** The patch for new runs of a text (its plain text and `runs` together) */
export const runsPatch = (runs: Parameters<typeof textFields>[0]): Patch => textFields(runs)
