import { useSyncExternalStore } from 'react'

/** Phones and narrow windows: the panels become a sheet over the board, the tools a bar at the bottom */
const QUERY = '(max-width: 760px)'

export function useNarrow() {
  return useSyncExternalStore(
    (listener) => {
      const m = window.matchMedia(QUERY)
      m.addEventListener('change', listener)
      return () => m.removeEventListener('change', listener)
    },
    () => window.matchMedia(QUERY).matches,
  )
}

/** A touch screen (bigger handles, no hover) */
export const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches
