// An object let go into a new parent keeps its faded copy in its place until the dragged copy has fallen into the parent (placeDrop.ts):
// it is "held" for that time, and the places that show a faded copy of what is dragged (sidebar rows, Dashboard cards) show it for the held too.
import { useSyncExternalStore } from 'react'

/** `<panelType>:<id>` → the sidebar row it left (if it left one) */
const holds = new Map<string, string | undefined>()
let version = 0
const listeners = new Set<() => void>()

const changed = () => {
  version++
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Starts keeping the object's faded copy */
export function holdFaded(key: string, nodeId?: string) {
  holds.set(key, nodeId)
  changed()
}

/** The copy has landed: it is not kept any more */
export function releaseFaded(key: string) {
  if (holds.delete(key)) changed()
}

/** Whether this object's faded copy is kept now */
export function useHeldKey(key: string): boolean {
  useSyncExternalStore(subscribe, () => version)
  return holds.has(key)
}

/** The sidebar row whose faded copy is kept now (the latest, if more than one) */
export function useHeldNodeId(): string | null {
  useSyncExternalStore(subscribe, () => version)
  let last: string | null = null
  for (const nodeId of holds.values()) if (nodeId) last = nodeId
  return last
}
