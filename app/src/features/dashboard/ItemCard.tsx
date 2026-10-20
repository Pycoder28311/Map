import { useResourceMenu } from '../../lib/resource/actions'
import type { AnyResource } from '../../resources/types'
import ResourceCard from './ResourceCard'

type Item = Record<string, unknown> & { id: number | string; createdAt?: string }

/** One item of any resource as a card in a Dashboard row, with its own ⋯ menu (pin, move to…, trash, delete) */
export default function ItemCard({ resource, item, onOpen }: { resource: AnyResource; item: Item; onOpen: () => void }) {
  const { menuOf, dialogs } = useResourceMenu(resource)
  return (
    <>
      <ResourceCard
        resource={resource}
        item={item}
        onOpen={onOpen}
        menu={menuOf({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })}
      />
      {dialogs}
    </>
  )
}
