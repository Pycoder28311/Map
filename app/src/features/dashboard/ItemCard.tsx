import { useResourceMenu } from '../../lib/resource/actions'
import type { AnyResource } from '../../resources/types'
import type { PlaceTarget } from '../drag/placeDrop'
import ResourceCard from './ResourceCard'

type Item = Record<string, unknown> & { id: number | string; createdAt?: string }

/** One item of any resource as a card in a Dashboard row, with its own ⋯ menu (pin, move to…, trash, delete) */
/** `place`: its place in the row, for drops before or after it (none: it takes no drops) */
export default function ItemCard({ resource, item, onOpen, place }: { resource: AnyResource; item: Item; onOpen: () => void; place?: PlaceTarget }) {
  const { menuOf, dialogs } = useResourceMenu(resource)
  return (
    <>
      <ResourceCard
        resource={resource}
        item={item}
        onOpen={onOpen}
        place={place}
        menu={menuOf({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })}
      />
      {dialogs}
    </>
  )
}
