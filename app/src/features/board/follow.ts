// Things that follow other things: a text attached to an object moves with it, and a name text that goes takes the
// area's name with it. Pure (follow.test.ts). Called at the end of applyChange, so it is part of the same change.
import { boundsOf } from './bounds'
import type { Board, BoardObject, TextObject } from './types'

const centreOf = (o: BoardObject) => {
  const b = boundsOf(o)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

/** `after` with what follows what `before` and `after` differ in settled (the same board when there is nothing to settle) */
export function followChanges(before: Board, after: Board): Board {
  const hasText = (b: Board) => b.objects.some((o) => o.kind === 'text' && (o.attach !== undefined || o.isName))
  if (!hasText(before) && !hasText(after)) return after
  const was = new Map(before.objects.map((o) => [o.id, o]))
  const now = new Map(after.objects.map((o) => [o.id, o]))
  let changed = false
  const objects = after.objects.map((o): BoardObject => {
    if (o.kind !== 'text' || o.attach === undefined) return o
    const target = now.get(o.attach)
    if (!target) {
      changed = true
      return { ...o, attach: undefined, isName: undefined }
    }
    const old = was.get(o.attach)
    // A text that was moved in the same change (a selection moved together) already went where it goes
    if (!old || old === target || was.get(o.id) !== o) return o
    const a = centreOf(old)
    const b = centreOf(target)
    const dx = Math.round(b.x - a.x)
    const dy = Math.round(b.y - a.y)
    if (dx === 0 && dy === 0) return o
    changed = true
    return { ...o, anchor: { x: o.anchor.x + dx, y: o.anchor.y + dy } }
  })
  // A name text that was removed takes the area's name with it
  const nameless = new Set<number>()
  for (const o of before.objects) if (o.kind === 'text' && o.isName && o.attach !== undefined && !now.has(o.id) && now.has(o.attach)) nameless.add(o.attach)
  const named = nameless.size === 0 ? objects : objects.map((o) => (nameless.has(o.id) && o.name !== '' ? { ...o, name: '' } : o))
  if (nameless.size > 0) changed = true
  return changed ? { ...after, objects: named } : after
}

/** The text that is an area's name, if it has one */
export const nameTextOf = (board: Board, borderId: number): TextObject | null =>
  (board.objects.find((o) => o.kind === 'text' && o.isName && o.attach === borderId) as TextObject | undefined) ?? null
