import { useEffect, useMemo, type ReactNode } from 'react'
import { subscribeChanges, subscribePatches } from './changes'
import { createListStore } from './listStore'
import { StoreContext } from './listStoreContext'

/**
 * The lists of every resource, loaded once and shared by the screens that show them (listStore.ts). A new user starts with
 * none. A write through useResourceActions that succeeded goes into the lists of that resource (the server's answer, no read); an update
 * shows its change before the answer (changes.ts patchChanged) and takes it back if the server refuses.
 */
export function ResourcesProvider({ userId, children }: { userId: string | undefined; children: ReactNode }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a different user gets a new store
  const store = useMemo(createListStore, [userId])
  useEffect(() => subscribeChanges((event) => store.apply(event)), [store])
  useEffect(() => subscribePatches((name, id, fields, onlyIf) => store.patch(name, id, fields, onlyIf)), [store])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
