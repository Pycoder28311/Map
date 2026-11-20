// Opening the Create modal from anywhere (the Dashboard's big Create buttons): the floating Create button (CreateFab) listens for it.

const EVENT = 'map:open-create'

/** Open the Create modal, as if the floating Create button had been pressed; `kind` (a resource name, e.g. "maps"): on that tab */
export function openCreate(kind?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(EVENT, { detail: kind }))
}

/** Call `open` (with the asked kind, if any) whenever something asks for the Create modal (openCreate); returns the unsubscribe */
export function onOpenCreate(open: (kind?: string) => void): () => void {
  const listener = (e: Event) => open((e as CustomEvent<string | undefined>).detail)
  window.addEventListener(EVENT, listener)
  return () => window.removeEventListener(EVENT, listener)
}
