// The sidebar's drop zones on the app's drop system (features/drag/objectDrop.ts): 'row' (move into
// a project, between rows, into Notes, or pin) and 'trash' (archive). SidebarDropProvider registers
// them; useSidebarDrop gives the sidebar what's dragged and where it would land.
import type { DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { useObjectDrop, type DropTargetValue, type ZoneHandler } from '../../../features/drag/objectDrop'
import { objectOf } from '../../../features/drag/objectDrag'
import type { PanelDragData } from '../../../features/workspace/types'
import { dragPoint } from '../../../lib/dnd'
import { archiveLayout } from '../../../mocks/layoutsStore'
import { canPlace } from '../../../mocks/projects'
import { archiveObject, getObjects, getPins, moveObject, reorderPinned } from '../../../mocks/projectsStore'
import { notifyChanged } from '../../../lib/resource/changes'
import { resourceByPanelType } from '../../../resources/registry'
import { dropIconOf, fallInto } from '../../ui/drop/fallInto'
import { snapshotRows } from '../../ui/tree/rowFlip'
import { swallow } from '../../ui/tree/swallow'
import { resolveDrop, rowDropPosition, type DropAction, type DropPosition, type RowDropData } from './treeDrop'

/** Where the current drag would land in the sidebar */
export type SidebarDropTarget =
  | { kind: 'row'; nodeId: string; position: DropPosition; action: DropAction }
  | { kind: 'trash' }
  | null

/** The droppable id of the trash bin, its zone and its drop key (data-drop-icon, lid) */
export const TRASH_ID = 'trash'

/** What the sidebar shows of the current drag: the row it left (an outline), and where it would land */
export function useSidebarDrop(): { draggingNodeId: string | null; target: SidebarDropTarget } {
  const { item, target } = useObjectDrop()
  const value = target?.value as (DropTargetValue & { nodeId: string; position: DropPosition; action: DropAction }) | undefined
  return {
    draggingNodeId: item?.nodeId ?? null,
    target:
      target?.zone === 'row' && value
        ? { kind: 'row', nodeId: value.nodeId, position: value.position, action: value.action }
        : target?.zone === 'trash'
          ? { kind: 'trash' }
          : null,
  }
}

/** A saved layout's tile being dragged (it can only go to the trash) */
const layoutOf = (data: unknown) => {
  const drag = data as PanelDragData | undefined
  return drag?.kind === 'layout' ? drag.layoutId : undefined
}

const rowElement = (nodeId: string) => document.querySelector(`[data-row-id="${CSS.escape(nodeId)}"]`)

/**
 * Archives an object with the Zen effect: `source` (the floating copy, or the row itself when archived
 * from its menu) falls into the trash bin, whose lid opens
 */
export function archiveWithEffect(objectId: string, source: Element | null, lifted = false) {
  fallInto(source, TRASH_ID, { lifted })
  snapshotRows()
  archiveObject(objectId)
}

/** Rows: from the row under the pointer and the pointer's height on it (rules: treeDrop.ts) */
export const rowZone: ZoneHandler = {
  target: (e: DragMoveEvent | DragOverEvent, item) => {
    if (!item?.objectId || !e.over) return null
    const row = e.over.data.current as RowDropData | undefined
    const point = dragPoint(e as DragMoveEvent)
    if (!row?.section || !point) return null
    const objects = getObjects()
    const dragged = objects.find((o) => o.id === item.objectId)
    // A container that may hold it (e.g. a folder only takes articles): a middle band for "into"
    const container = objects.find((o) => o.id === row.objectId)
    const canInto = !!row.folder && !!dragged && !!container && canPlace(dragged.kind, container.kind)
    const position = row.section === 'objects-end' ? 'after' : rowDropPosition(point.y, e.over.rect, canInto)
    const action = resolveDrop(objects, getPins(), item.objectId, row, position)
    return action ? { key: `${row.nodeId}:${position}`, nodeId: row.nodeId, position, action } : null
  },
  drop: (data, target, float) => {
    const object = objectOf(data)
    if (!object?.objectId) return
    const { nodeId, action } = target as DropTargetValue & { nodeId: string; action: DropAction }
    // The dropped row glides from where it was let go to its new place
    snapshotRows(float && object.nodeId ? { [object.nodeId]: float.getBoundingClientRect() } : {})
    if (action.kind === 'pin') return reorderPinned(object.objectId, action.beforeId)
    // Into a closed folder: it falls in, the lid opens
    const closed = action.into && rowElement(nodeId)?.closest('li')?.getAttribute('aria-expanded') === 'false'
    if (closed) fallInto(float, nodeId, { lifted: true })
    moveObject(object.objectId, { parentId: action.parentId, beforeId: action.beforeId })
  },
}

/** The trash bin: any object, or a saved layout's tile */
export const trashZone: ZoneHandler = {
  target: (e, item) => (item?.objectId || layoutOf(e.active.data.current) ? { key: TRASH_ID } : null),
  drop: (data, _target, float) => {
    const layoutId = layoutOf(data)
    if (layoutId) {
      // The tile itself falls into the bin
      const tile = document.querySelector(`[data-layout-tile="${CSS.escape(layoutId)}"]`)
      const bin = dropIconOf(TRASH_ID)
      if (tile && bin) swallow({ source: tile, to: bin, lidKey: TRASH_ID })
      return archiveLayout(layoutId)
    }
    const object = objectOf(data)
    if (!object?.objectId) return
    // A resource's item (a note) is archived on the server
    const resource = resourceByPanelType(object.kind)
    if (resource) {
      fallInto(float, TRASH_ID, { lifted: true })
      resource.api
        .update(object.objectId, { archived: true })
        .then((item) => notifyChanged({ name: resource.name, item }))
        .catch((error) => console.error(`Could not move the ${resource.ui.label.toLowerCase()} to the Trash`, error))
      return
    }
    archiveWithEffect(object.objectId, float, true)
  },
}
