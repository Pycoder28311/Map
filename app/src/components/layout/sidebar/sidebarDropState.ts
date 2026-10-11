// The sidebar's drag & drop state (SidebarDropProvider fills it) and the drop logic it applies.
import type { DragMoveEvent, DragOverEvent } from '@dnd-kit/core'
import { createContext, useContext } from 'react'
import { snapshotRows } from '../../ui/tree/rowFlip'
import { swallow } from '../../ui/tree/swallow'
import type { PanelDragData } from '../../../features/workspace/types'
import { dragPoint } from '../../../lib/dnd'
import { archiveLayout } from '../../../mocks/layoutsStore'
import { archiveObject, getObjects, getPins, moveObject, reorderPinned } from '../../../mocks/projectsStore'
import { resolveDrop, rowDropPosition, type DropAction, type DropPosition, type RowDropData } from './treeDrop'

/** Where the current drag would land in the sidebar */
export type SidebarDropTarget =
  | { kind: 'row'; nodeId: string; position: DropPosition; action: DropAction }
  | { kind: 'trash' }
  | null

export type SidebarDrop = {
  /** The sidebar row being dragged (its place stays empty) */
  draggingNodeId: string | null
  target: SidebarDropTarget
}

export const SidebarDropContext = createContext<SidebarDrop>({ draggingNodeId: null, target: null })

export const useSidebarDrop = () => useContext(SidebarDropContext)

/** The droppable id of the trash bin */
export const TRASH_ID = 'trash'

export const treeInfo = (data: unknown) => {
  const drag = data as PanelDragData | undefined
  return drag && (drag.kind === 'new' || drag.kind === 'tree') ? drag.tree : undefined
}

/** A saved layout's tile being dragged (it can only go to the trash) */
const layoutOf = (data: unknown) => {
  const drag = data as PanelDragData | undefined
  return drag?.kind === 'layout' ? drag.layoutId : undefined
}

export const sameTarget = (a: SidebarDropTarget, b: SidebarDropTarget) =>
  a === b ||
  (a?.kind === 'trash' && b?.kind === 'trash') ||
  (a?.kind === 'row' && b?.kind === 'row' && a.nodeId === b.nodeId && a.position === b.position)

/** Where a drag would land now: from the row under the pointer and the pointer's height on it */
export function targetOf(e: DragMoveEvent | DragOverEvent): SidebarDropTarget {
  if (layoutOf(e.active.data.current)) return e.over?.id === TRASH_ID ? { kind: 'trash' } : null
  const objectId = treeInfo(e.active.data.current)?.objectId
  if (!objectId || !e.over) return null
  if (e.over.id === TRASH_ID) return { kind: 'trash' }
  const row = e.over.data.current as RowDropData | undefined
  if (!row?.section) return null
  const point = dragPoint(e as DragMoveEvent)
  if (!point) return null

  const objects = getObjects()
  const dragged = objects.find((o) => o.id === objectId)
  const canInto = !!row.folder && dragged?.kind !== 'project'
  const position = row.section === 'notes-end' ? 'after' : rowDropPosition(point.y, e.over.rect, canInto)
  const action = resolveDrop(objects, getPins(), objectId, row, position)
  return action ? { kind: 'row', nodeId: row.nodeId, position, action } : null
}

const rowElement = (nodeId: string) => document.querySelector(`[data-row-id="${CSS.escape(nodeId)}"]`)

/**
 * Archives an object with the Zen effect: `source` (the lifted row, or the row itself when archived
 * from its menu) falls into the trash bin, whose lid opens
 */
export function archiveWithEffect(objectId: string, source: Element | null, lifted = false) {
  const bin = document.querySelector('[data-trash-icon]')
  if (source && bin) swallow({ source, to: bin, lidKey: TRASH_ID, lifted })
  snapshotRows()
  archiveObject(objectId)
}

/** Applies a drop in the sidebar: a move (into a closed folder: it falls in), a pin, or the trash */
export function drop(data: unknown, target: SidebarDropTarget) {
  const layoutId = layoutOf(data)
  if (layoutId && target?.kind === 'trash') {
    // The tile itself falls into the bin
    const bin = document.querySelector('[data-trash-icon]')
    const tile = document.querySelector(`[data-layout-tile="${CSS.escape(layoutId)}"]`)
    if (tile && bin) swallow({ source: tile, to: bin, lidKey: TRASH_ID })
    return archiveLayout(layoutId)
  }
  const tree = treeInfo(data)
  if (!tree?.objectId || !target) return
  const lifted = document.querySelector('[data-lifted-row]')

  if (target.kind === 'trash') return archiveWithEffect(tree.objectId, lifted, true)

  const { action } = target
  // The dropped row glides from where it was let go to its new place
  snapshotRows(lifted ? { [tree.nodeId]: lifted.getBoundingClientRect() } : {})
  if (action.kind === 'pin') return reorderPinned(tree.objectId, action.beforeId)

  // Into a closed folder: it falls in, the lid opens
  const folderRow = action.into ? rowElement(target.nodeId) : null
  const closed = folderRow?.closest('li')?.getAttribute('aria-expanded') === 'false'
  const icon = closed ? folderRow?.querySelector('[data-row-icon]') : null
  if (lifted && icon) swallow({ source: lifted, to: icon, lidKey: target.nodeId, lifted: true })
  moveObject(tree.objectId, { parentId: action.parentId, beforeId: action.beforeId })
}
