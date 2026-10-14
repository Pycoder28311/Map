// Which cards are ticked with their select checkbox (per page load). Shared by object id, so any card
// kind can use it. Pure store + a hook (selectStore.test.ts).
import { useSyncExternalStore } from 'react'

let selected: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function set(next: Set<string>) {
  selected = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getSelected = () => selected

/** Ticks it, or unticks it */
export function toggleSelected(id: string) {
  const next = new Set(selected)
  if (!next.delete(id)) next.add(id)
  set(next)
}

/** Unticks everything (nothing happens, nobody is told, if nothing was ticked) */
export function clearSelected() {
  if (selected.size > 0) set(new Set())
}

/** Whether the object is ticked; re-renders when that changes */
export const useSelected = (id: string) => useSyncExternalStore(subscribe, () => selected.has(id))

/** How many are ticked; re-renders on change */
export const useSelectedCount = () => useSyncExternalStore(subscribe, () => selected.size)
