// Which objects of each map are selected (per page load). Pure store + a hook (selection.test.ts).
import { useSyncExternalStore } from 'react'

const NONE: ReadonlySet<number> = new Set()
let selections = new Map<string, ReadonlySet<number>>()
const listeners = new Set<() => void>()

function set(mapId: string, ids: ReadonlySet<number>) {
  selections = new Map(selections).set(mapId, ids)
  listeners.forEach((listener) => listener())
}

export function subscribeSelection(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The selected ids (the same empty set every time for nothing selected) */
export const getSelection = (mapId: string): ReadonlySet<number> => selections.get(mapId) ?? NONE

export const useSelection = (mapId: string) => useSyncExternalStore(subscribeSelection, () => getSelection(mapId))

const same = (a: ReadonlySet<number>, b: ReadonlySet<number>) => a.size === b.size && [...a].every((id) => b.has(id))

/** Makes these (and only these) selected; nobody is told when nothing changes */
export function select(mapId: string, ids: Iterable<number>) {
  const next = new Set(ids)
  if (!same(getSelection(mapId), next)) set(mapId, next.size === 0 ? NONE : next)
}

/** Selects it if it was not, unselects it if it was */
export function toggleSelected(mapId: string, id: number) {
  const next = new Set(getSelection(mapId))
  if (!next.delete(id)) next.add(id)
  select(mapId, next)
}

export const clearSelection = (mapId: string) => select(mapId, [])

/** Tests only */
export function resetSelection() {
  selections = new Map()
  listeners.forEach((listener) => listener())
}
