import { createContext, useContext } from 'react'
import type { ListStore } from './listStore'

export const StoreContext = createContext<ListStore | null>(null)

export function useListStore(): ListStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useResourceList needs a <ResourcesProvider> above it')
  return store
}
