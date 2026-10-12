// Share mode: idle; choosing (the screen dims except what can be shared: ShareMode); chosen (the
// Share popout shows the ways to share it). One at a time, app-wide.
import { useSyncExternalStore } from 'react'

export type ShareState = { phase: 'idle' | 'choosing' | 'chosen'; chosenId: string | null }

let state: ShareState = { phase: 'idle', chosenId: null }
const listeners = new Set<() => void>()

function set(next: ShareState) {
  state = next
  listeners.forEach((listener) => listener())
}

/** Dims the screen and highlights what can be shared */
export const startSharing = () => set({ phase: 'choosing', chosenId: null })
/** The object to share */
export const chooseToShare = (id: string) => set({ phase: 'chosen', chosenId: id })
export const stopSharing = () => {
  if (state.phase !== 'idle') set({ phase: 'idle', chosenId: null })
}

export const useShareState = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
