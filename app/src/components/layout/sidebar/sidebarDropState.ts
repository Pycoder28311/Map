// The sidebar's drop zone on the app's drop system (features/drag/objectDrop.ts): the trash bin. SidebarDropProvider registers it;
// useSidebarDrop gives the sidebar what's dragged and whether it would land in the bin.
import { useObjectDrop, type ZoneHandler } from '../../../features/drag/objectDrop'
import { objectOf } from '../../../features/drag/objectDrag'
import { useHeldNodeId } from '../../../features/drag/held'
import { PLACE_ZONE, type PlaceValue } from '../../../features/drag/placeDrop'
import type { TreeDropPosition } from '../../ui/tree/types'
import type { PanelDragData } from '../../../features/workspace/types'
import { archiveLayout } from '../../../features/layouts/layoutsStore'
import { actionsOf } from '../../../lib/resource/hooks'
import { resourceByPanelType } from '../../../resources/registry'
import { dropIconOf, fallInto } from '../../ui/drop/fallInto'
import { swallow } from '../../ui/tree/swallow'
import { burnDown } from './burnDown'

/** Where the current drag would land in the sidebar */
export type SidebarDropTarget = { kind: 'trash' } | null

/** The droppable id of the trash bin, its zone and its drop key (data-drop-icon, lid) */
export const TRASH_ID = 'trash'

/** What the sidebar shows of the current drag: the row it left (an outline), whether it would land in the bin, and the place it would go (before, after or into a row) */
export function useSidebarDrop(): { draggingNodeId: string | null; target: SidebarDropTarget; place: { nodeId: string; position: TreeDropPosition } | null } {
  const { item, target } = useObjectDrop()
  // Let go into a new parent, a row keeps its faded copy until the dragged one has fallen in
  const held = useHeldNodeId()
  const value = target?.zone === PLACE_ZONE ? (target.value as unknown as PlaceValue) : null
  const position = value?.side === 'out' ? value.edge : value?.side !== 'end' ? value?.side : undefined
  const place = value?.nodeId && position ? { nodeId: value.nodeId, position } : null
  return { draggingNodeId: item?.nodeId ?? held, target: target?.zone === 'trash' ? { kind: 'trash' } : null, place }
}

/** A saved layout's tile being dragged (it can only go to the trash) */
const layoutOf = (data: unknown) => {
  const drag = data as PanelDragData | undefined
  return drag?.kind === 'layout' ? drag.layoutId : undefined
}

/** The trash bin: any resource's item (it goes to the Trash on the server, or in its mock), or a saved layout's tile */
export const trashZone: ZoneHandler = {
  target: (e, item) => (item?.objectId || layoutOf(e.active.data.current) ? { key: TRASH_ID } : null),
  drop: (data, _target, float) => {
    const layoutId = layoutOf(data)
    if (layoutId) {
      // The tile itself falls into the bin
      const tile = document.querySelector(`[data-layout-tile="${CSS.escape(layoutId)}"]`)
      const bin = dropIconOf(TRASH_ID)
      // With the embers on it goes behind the rows and breaks at the bottom; else it falls into the bin
      if (tile && !burnDown(tile) && bin) swallow({ source: tile, to: bin, lidKey: TRASH_ID })
      return archiveLayout(layoutId)
    }
    const object = objectOf(data)
    const resource = resourceByPanelType(object?.kind)
    if (!object?.objectId || !resource) return
    if (!burnDown(float, { lifted: true })) fallInto(float, TRASH_ID, { lifted: true })
    actionsOf(resource)
      .trash(object.objectId)
      .catch((error) => console.error(`Could not move the ${resource.ui.label.toLowerCase()} to the Trash`, error))
  },
}
