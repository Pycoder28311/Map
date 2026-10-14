// How far in from the page's right edge the floating things (the Create button) must stay: a docked sidebar of a page
// (the map editor's) takes that space. Set by the page while it has one, 0 otherwise.
import { useSyncExternalStore } from 'react'

let inset = 0
const listeners = new Set<() => void>()

export function setPageInset(px: number) {
  if (px === inset) return
  inset = px
  listeners.forEach((l) => l())
}

export const usePageInset = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => inset,
  )
