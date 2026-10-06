import { createContext, useContext } from 'react'
import type { PanelRegistry } from './types'

// The workspace engine doesn't know which panels exist: the app passes its registry to
// <WorkspaceProvider panels={…}>. This keeps features/workspace reusable and free of import cycles.
export const PanelRegistryContext = createContext<PanelRegistry | null>(null)

export function usePanelRegistry(): PanelRegistry {
  const registry = useContext(PanelRegistryContext)
  if (!registry) throw new Error('usePanelRegistry must be used inside <WorkspaceProvider>')
  return registry
}
