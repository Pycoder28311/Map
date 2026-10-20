import { useRef, useState, type ReactNode } from 'react'
import { LuPlus } from 'react-icons/lu'
import { useDragSurface } from '../../../features/drag/surfaces'
import { ObjectRowLook } from '../../../features/objects/ObjectRow'
import { useResourceMenu } from '../../../lib/resource/actions'
import { useResourceList } from '../../../lib/resource/hooks'
import type { AnyResource } from '../../../resources/types'
import Button from '../buttons/Button'
import ResourceCreateDialog from './ResourceCreateDialog'
import ResourceList from './ResourceList'
import ResourceRow from './ResourceRow'

type Props = {
  resource: AnyResource
  /** The line under the title */
  description?: ReactNode
  /** A click on a row (the notes open their modal); without it, a row opens nothing (its panel button does) */
  onOpenItem?: (id: string) => void
}

/**
 * A resource's list page (surfaces.page): every item, a page at a time, as draggable rows with their ⋯ menu, and a button to create
 * one. Also a workspace panel (src/panels.ts), so it renders no <main>.
 */
export default function ResourcePage({ resource, description, onOpenItem }: Props) {
  const list = useResourceList(resource)
  const { menuOf, dialogs } = useResourceMenu(resource)
  const [creating, setCreating] = useState(false)
  const listRef = useRef<HTMLUListElement>(null)
  // Over this list, a dragged object looks like one of its rows
  useDragSurface(`${resource.name}-list`, listRef, (item) => <ObjectRowLook label={item.label} icon={item.icon} />)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-8 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-title">{resource.ui.plural}</h1>
          {description && <p className="text-body text-fg-muted">{description}</p>}
        </div>
        <Button icon={LuPlus} onClick={() => setCreating(true)}>
          New {resource.ui.label.toLowerCase()}
        </Button>
      </div>
      <ResourceList
        list={list}
        keyOf={(item) => item.id}
        empty={<p className="text-body text-fg-muted">No {resource.ui.plural.toLowerCase()} yet. Create one with the button above.</p>}
        className="flex flex-col gap-2"
        renderItem={(item) => (
          <ResourceRow
            resource={resource}
            item={item}
            place={`${resource.name}-list`}
            onOpen={onOpenItem && (() => onOpenItem(String(item.id)))}
            menu={menuOf({ id: item.id, title: resource.ui.row.title(item), pinned: resource.ui.row.pinned?.(item) })}
          />
        )}
      />
      {dialogs}
      {creating && <ResourceCreateDialog resource={resource} onClose={() => setCreating(false)} />}
    </div>
  )
}
