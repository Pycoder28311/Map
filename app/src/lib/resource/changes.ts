// A resource changed (something was created, updated or deleted through useResourceActions, after the server said yes): the lists of
// it take the news in (listStore.ts) and an open item of it takes the new version. This file carries no data: only the news.

export type ChangeEvent = {
  /** The resource's name, e.g. 'notes' */
  name: string
  /** The server's version of a created or updated item */
  item?: { id: number | string }
  /** The id of a deleted item */
  removedId?: number | string
}

type Listener = (event: ChangeEvent) => void
const listeners = new Set<Listener>()

export function notifyChanged(event: ChangeEvent) {
  listeners.forEach((listener) => listener(event))
}

export function subscribeChanges(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether the event is about this item (ids are numbers on the server and strings in panel refs) */
export const isAbout = (event: ChangeEvent, id: number | string) =>
  (event.item !== undefined && String(event.item.id) === String(id)) || (event.removedId !== undefined && String(event.removedId) === String(id))

/** What a patch gave back: the values the fields had, and the whole item as it was before */
export type PatchResult = { before: Record<string, unknown>; row: Record<string, unknown> }
type Patcher = (name: string, id: number | string, fields: Record<string, unknown>, onlyIf?: Record<string, unknown>) => PatchResult | null
const patchers = new Set<Patcher>()

export function subscribePatches(patcher: Patcher) {
  patchers.add(patcher)
  return () => {
    patchers.delete(patcher)
  }
}

/**
 * Shows a change of some fields at once, before the server has answered (see listStore.patch): in every list and open item that
 * holds the item. `onlyIf`: a field changes only where it still has this value. Null when nothing holds the item (nothing was shown).
 */
export function patchChanged(name: string, id: number | string, fields: Record<string, unknown>, onlyIf?: Record<string, unknown>): PatchResult | null {
  for (const patcher of patchers) {
    const result = patcher(name, id, fields, onlyIf)
    if (result) return result
  }
  return null
}
