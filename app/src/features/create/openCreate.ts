// Opening the Create modal from anywhere (the Dashboard's big Create button): the floating Create button (CreateFab) listens for it.

const EVENT = 'map:open-create'

/** Open the Create modal, as if the floating Create button had been pressed */
export function openCreate() {
  window.dispatchEvent(new Event(EVENT))
}

/** Call `open` whenever something asks for the Create modal (openCreate); returns the unsubscribe */
export function onOpenCreate(open: () => void): () => void {
  window.addEventListener(EVENT, open)
  return () => window.removeEventListener(EVENT, open)
}
