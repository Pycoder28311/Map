import { useRef, useState } from 'react'
import ResourceModal from '../../components/ui/resource/ResourceModal'
import { resourceByName } from '../../resources/registry'
import type { AnyResource } from '../../resources/types'
import { useDragSurface } from '../drag/surfaces'
import { useOpenLayout } from '../objects/ListRows'
import { single } from '../workspace/layout'
import { useBlockFlip } from './blockFlip'
import { sectionsBelow, type ColumnId } from './columns'
import ResourceSection from './ResourceSection'
import { SectionCardLook } from './SectionCard'

type Props = {
  columns: ColumnId[]
}

/**
 * Under the columns: a row per resource with a Dashboard surface that isn't shown as a column (⋯ on a column moves one up), each a
 * strip of its cards that scrolls sideways (ResourceSection). A card opens in its modal (the item's editor), or as a page when its
 * resource has a panel of its own (a map's board).
 */
export default function DashboardSections({ columns }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const open = useOpenLayout()
  // The item open in its modal
  const [editing, setEditing] = useState<{ resource: AnyResource; id: string } | null>(null)

  const rows = sectionsBelow(columns)
  useBlockFlip(rootRef, 'sections', rows.join(','))
  // Over the rows, a dragged object looks like a card
  useDragSurface('dash-sections', rootRef, (item) => <SectionCardLook label={item.label} icon={item.icon} />)

  return (
    <div ref={rootRef} data-flip-root="sections" className="flex flex-col gap-8">
      {rows.map((row) => {
        const resource = resourceByName(row)
        if (!resource) return null
        const openItem = (id: string) => (resource.customPanel ? open(single({ type: resource.panelType, id })) : setEditing({ resource, id }))
        return <ResourceSection key={row} resource={resource} onOpen={openItem} />
      })}
      {editing && <ResourceModal resource={editing.resource} itemId={editing.id} onClose={() => setEditing(null)} />}
    </div>
  )
}
