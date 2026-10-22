import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import type { AnyResource } from '../../resources/types'

type ItemModal = {
  /** Shows an item in the centred modal (`new`: an empty one that is made when something is typed) */
  open: (resource: AnyResource, id: string) => void
}

const Context = createContext<ItemModal | null>(null)

export function useItemModal(): ItemModal {
  const value = useContext(Context)
  if (!value) throw new Error('useItemModal needs an <ItemModalProvider> above it')
  return value
}

/** The same, or null outside the provider (code that works without it: it then goes to the page) */
export const useOptionalItemModal = () => useContext(Context)

/** One centred item modal for the whole signed-in app (the sidebar's rows and "+" of the resources with surfaces.modal open it) */
export function ItemModalProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<{ resource: AnyResource; id: string | null } | null>(null)
  const value = useMemo<ItemModal>(() => ({ open: (resource, id) => setShown({ resource, id }) }), [])
  return (
    <Context.Provider value={value}>
      {children}
      {shown && (
        <ResourceModal
          resource={shown.resource}
          itemId={shown.id}
          onClose={() => setShown(null)}
          onMade={(id) => setShown({ resource: shown.resource, id })}
        />
      )}
    </Context.Provider>
  )
}
