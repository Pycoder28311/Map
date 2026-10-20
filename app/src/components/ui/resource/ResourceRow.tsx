import { LuPin } from 'react-icons/lu'
import ObjectRow from '../../../features/objects/ObjectRow'
import OpenAsPanelButton from '../../../features/workspace/OpenAsPanelButton'
import type { AnyResource } from '../../../resources/types'
import TreeMenu from '../tree/TreeMenu'
import type { TreeMenuGroup } from '../tree/types'

type Props = {
  resource: AnyResource
  /** A list item */
  item: Record<string, unknown> & { id: number | string }
  /** Keeps drag ids unique where the row is shown (e.g. "notes-page") */
  place: string
  onOpen?: () => void
  /** The ⋯ menu's groups (useResourceMenu().menuOf) */
  menu?: TreeMenuGroup[]
  variant?: 'card' | 'plain'
  className?: string
}

/**
 * One item of any resource as a row: its icon, title and subtitle (the resource's `ui.row`), a pin mark, "open as panel" and the ⋯
 * menu. Draggable like every object row: onto pane edges, the Trash… (features/drag)
 */
export default function ResourceRow({ resource, item, place, onOpen, menu, variant = 'card', className }: Props) {
  const id = String(item.id)
  const title = resource.ui.row.title(item)
  const panel = resource.surfaces.panel ? { type: resource.panelType, id } : undefined
  return (
    <ObjectRow
      object={{ id, kind: resource.panelType, name: title }}
      icon={resource.ui.icon}
      dragId={`${place}:${id}`}
      panel={panel}
      hint={resource.ui.row.subtitle?.(item)}
      variant={variant}
      onOpen={onOpen}
      className={className}
      end={
        <>
          {resource.ui.row.pinned?.(item) && <LuPin aria-label="Pinned" className="size-3.5 shrink-0 text-fg-subtle" />}
          {panel && <OpenAsPanelButton panel={panel} />}
          {menu && <TreeMenu label={`More: ${title}`} groups={menu} />}
        </>
      }
    />
  )
}
