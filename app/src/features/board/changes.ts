// A change to a board as data: several objects updated, removed and added at once, which is one undo step.
// Pure (changes.test.ts); the gestures use it to preview (applyChange on a copy) and to commit (boardStore.changeObjects).
import { followChanges } from './follow'
import { LAYER_MAIN, type Board, type BoardObject, type Layer } from './types'

/** A new object: everything but the id; the layer is the drawing layer unless given */
export type Draft = BoardObject extends infer O ? (O extends BoardObject ? Omit<O, 'id' | 'layer'> & { layer?: Layer } : never) : never

type Intersect<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never

/** The fields of an object that can change (not its id or kind) */
export type Patch = Partial<Intersect<BoardObject extends infer O ? (O extends BoardObject ? Omit<O, 'id' | 'kind'> : never) : never>>

export type Change = {
  update?: { id: number; patch: Patch }[]
  remove?: number[]
  add?: Draft[]
}

/** The board after `change`, and the ids the added objects got (the same board object when nothing changed) */
export function applyChange(board: Board, change: Change): { board: Board; added: number[] } {
  const removed = new Set((change.remove ?? []).filter((id) => board.objects.some((o) => o.id === id)))
  const updates = new Map((change.update ?? []).filter((u) => !removed.has(u.id)).map((u) => [u.id, u.patch]))
  const adds = change.add ?? []
  if (removed.size === 0 && adds.length === 0 && ![...updates.keys()].some((id) => board.objects.some((o) => o.id === id))) {
    return { board, added: [] }
  }

  const objects = board.objects
    .filter((o) => !removed.has(o.id))
    .map((o) => {
      const patch = updates.get(o.id)
      const next = patch ? ({ ...o, ...patch, id: o.id, kind: o.kind } as BoardObject) : o
      // Links to what was removed go too
      return removed.size > 0 && next.links.some((l) => l.to === 'board' && removed.has(l.id))
        ? { ...next, links: next.links.filter((l) => !(l.to === 'board' && removed.has(l.id))) }
        : next
    })
  const added = adds.map((_, i) => board.nextId + i)
  adds.forEach((draft, i) => objects.push({ ...draft, layer: draft.layer ?? LAYER_MAIN, id: added[i] } as BoardObject))
  return { board: followChanges(board, { nextId: board.nextId + adds.length, objects }), added }
}
