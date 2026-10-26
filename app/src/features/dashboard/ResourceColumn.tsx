import ResourceRow from '../../components/ui/resource/ResourceRow'
import { useResourceMenu } from '../../lib/resource/actions'
import { useResourceList } from '../../lib/resource/hooks'
import type { AnyResource } from '../../resources/types'
import { Rows, useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import Button from '../../components/ui/buttons/Button'

/** A resource's Dashboard column (the Notes column): its first rows, and "Show all" to its page. Rows drag and open like every object row */
export default function ResourceColumn({ resource, place }: { resource: AnyResource; place: string }) {
  const list = useResourceList(resource)
  const { menuOf, dialogs } = useResourceMenu(resource)
  const open = useOpenLayout()

  if (list.status === 'loading') return <p className="px-2 py-2 text-body text-fg-subtle">Loading…</p>
  if (list.status === 'error') {
    return (
      <Button variant="text" onClick={list.refresh} className="m-2 self-start text-danger">
        Could not load. Try again
      </Button>
    )
  }
  const rows = list.items.map((item) => (
    <ResourceRow
      key={item.id}
      resource={resource}
      item={item}
      place={place}
      variant="plain"
      menu={menuOf({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })}
      onOpen={() => open(single({ type: resource.panelType, id: String(item.id) }))}
    />
  ))
  return (
    <>
      <Rows rows={rows} empty={`No ${resource.ui.plural.toLowerCase()} yet.`} allHref={resource.surfaces.page} />
      {dialogs}
    </>
  )
}
