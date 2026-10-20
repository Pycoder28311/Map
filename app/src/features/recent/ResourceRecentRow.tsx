import { useEffect, useSyncExternalStore } from 'react'
import { useListStore } from '../../lib/resource/listStoreContext'
import ResourceRow from '../../components/ui/resource/ResourceRow'
import { useResourceItem } from '../../lib/resource/hooks'
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
 * A Recent entry that is one item of a resource (a note). It is taken from the lists already loaded (the sidebar's, the Dashboard's):
 * no request when it is there, or while such a list loads. Only an item none of them knows is read from the server. Once it is found
 * gone or in the Trash its entry is removed. While it loads (or fails) the row says so, with the resource's name.
 */
export default function ResourceRecentRow({ resource, id, entryKey, userId, place, open, afterOpen }: Props) {
  const store = useListStore()
  const known = useSyncExternalStore(store.watchAll, () => store.lookup(resource.name, id))
  const { item: fetched, notFound, status } = useResourceItem(resource, known === null ? id : undefined)
  const item = known !== null && typeof known === 'object' ? (known as typeof fetched) : fetched
  const gone = known === 'gone' || notFound || item?.archived === true

  useEffect(() => {
    if (gone && userId) removeRecent(userId, entryKey)
  }, [gone, userId, entryKey])

  if (!item || gone) return <LinkRow icon={resource.ui.icon} label={status === 'error' ? `${resource.ui.label} (could not load)` : resource.ui.label} onOpen={() => {}} />

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
