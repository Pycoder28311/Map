// MOCK DATA: pictures kept in memory (a point's banner). Nothing is saved: a reload forgets them.
// Replaced by uploads later (same three functions, async); the UI only uses what's exported here.
import { useSyncExternalStore } from 'react'

const urls = new Map<string, string>()
const listeners = new Set<() => void>()
let nextId = 1

/** Keeps a picture and returns its id */
export function putImage(blob: Blob): string {
  const id = `img${nextId++}`
  urls.set(id, URL.createObjectURL(blob))
  listeners.forEach((l) => l())
  return id
}

/** The address a picture can be shown from (undefined for an id that is not here) */
export const getImageUrl = (id: string | undefined) => (id ? urls.get(id) : undefined)

export function useImageUrl(id: string | undefined) {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => getImageUrl(id),
  )
}
