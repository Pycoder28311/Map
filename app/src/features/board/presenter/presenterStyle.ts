// How the presenter changes from one map to the next. Kept while the app is open, like the pens.
import { useSyncExternalStore } from 'react'

export type PresenterStyle = 'carousel' | 'fade' | 'book'
export const PRESENTER_STYLES: { id: PresenterStyle; label: string }[] = [
  { id: 'carousel', label: 'Carousel' },
  { id: 'fade', label: 'Fade' },
  { id: 'book', label: 'Book' },
]

let style: PresenterStyle = 'carousel'
const listeners = new Set<() => void>()

export const getPresenterStyle = () => style
export function setPresenterStyle(next: PresenterStyle) {
  style = next
  listeners.forEach((l) => l())
}
export const usePresenterStyle = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => style,
  )
