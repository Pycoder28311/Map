import { useEffect, useSyncExternalStore } from 'react'
import { useListStore } from '../../lib/resource/listStoreContext'
import ResourceRow from '../../components/ui/resource/ResourceRow'
import type { AnyResource } from '../../resources/types'
import { LinkRow } from '../objects/ListRows'
import { single, type WorkspaceLayout } from '../workspace/layout'
import { removeRecent } from './recentStore'

type Props = {
  resource: AnyResource
  /** The item's id (from the panel key) */
  id: string
  /** The Recent entry this row is */
  entryKey: string
  userId: string | undefined
  place: string
  open: (layout: WorkspaceLayout) => void
  afterOpen?: () => void
}

/**
 * A Recent entry that is one item of a resource (a note). It is taken from the lists already loaded (the sidebar's, the Dashboard's)
 * and never read from the server: an item none of them holds shows the resource's name only. Once a complete list is found to be
 * without it (gone or in the Trash) its entry is removed.
 */
export default function ResourceRecentRow({ resource, id, entryKey, userId, place, open, afterOpen }: Props) {
  const store = useListStore()
  const known = useSyncExternalStore(store.watchAll, () => store.lookup(resource.name, id))
  const item = known !== null && typeof known === 'object' ? (known as { id: string | number; archived?: boolean } & Record<string, unknown>) : undefined
  const gone = known === 'gone' || item?.archived === true

  useEffect(() => {
    if (gone && userId) removeRecent(userId, entryKey)
  }, [gone, userId, entryKey])

  if (!item || gone) return <LinkRow icon={resource.ui.icon} label={resource.ui.label} onOpen={() => {}} />

  return (
    <ResourceRow
      resource={resource}
      item={item}
      place={place}
      variant="plain"
      onOpen={() => {
        open(single({ type: resource.panelType, id }))
        afterOpen?.()
      }}
    />
  )
}
