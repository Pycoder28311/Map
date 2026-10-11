// Where a dragged sidebar object lands, and whether it may (pure: tested in treeDrop.test.ts).
// Rules: maps and notes go into any unlocked project, between rows inside a project, or into Notes
// (parentless); projects are reordered among projects, never nested; Pinned rows reorder pins (a
// dropped object gets pinned); Dashboard never takes a drop.
import type { MockObject } from '../../../mocks/projects'

export type DropPosition = 'before' | 'after' | 'into'

/** What each droppable row says about itself (dnd-kit droppable data) */
export type RowDropData = {
  /** The drop system's zone (features/drag/objectDrop.ts) and priority among droppables */
  zone?: 'row'
  priority?: number
  nodeId: string
  section: 'pinned' | 'projects' | 'notes' | 'notes-end' | 'fixed'
  /** The object this row is */
  objectId?: string
  /** A project's Overview row: which project */
  overviewOf?: string
  /** An unlocked folder: may take drops into it */
  folder?: boolean
}

export type DropAction =
  /** Move to `parentId` (null: top level), just before `beforeId` (null: last). `into`: dropped on that folder's row */
  | { kind: 'move'; parentId: string | null; beforeId: string | null; into?: string }
  /** Pin (or move the pin) just before `beforeId` among the pins (null: last) */
  | { kind: 'pin'; beforeId: string | null }

/**
 * From the pointer's height on a row, like the Zen reel's resolveTarget: on a folder that can take
 * it, the middle (25%–78%) is "into"; above the middle "before", below it "after"
 */
export function rowDropPosition(y: number, rect: { top: number; height: number }, canInto: boolean): DropPosition {
  const frac = (y - rect.top) / rect.height
  if (canInto && frac > 0.25 && frac < 0.78) return 'into'
  return frac < 0.5 ? 'before' : 'after'
}

/** The next object after `from` (in document order) that matches, the dragged one skipped */
function nextAfter(objects: MockObject[], from: MockObject, draggedId: string, match: (o: MockObject) => boolean) {
  const start = objects.indexOf(from)
  return objects.slice(start + 1).find((o) => o.id !== draggedId && match(o))?.id ?? null
}

/** What dropping `draggedId` on a row at `position` does, or null when it isn't allowed */
export function resolveDrop(
  objects: MockObject[],
  pins: string[],
  draggedId: string,
  row: RowDropData,
  position: DropPosition,
): DropAction | null {
  const dragged = objects.find((o) => o.id === draggedId)
  if (!dragged || !dragged.draggable) return null
  const isProject = dragged.kind === 'project'

  switch (row.section) {
    case 'fixed':
      return null
    case 'pinned': {
      if (!row.objectId) return null
      const i = pins.indexOf(row.objectId)
      const beforeId = position === 'after' ? (pins.slice(i + 1).find((p) => p !== draggedId) ?? null) : row.objectId
      return beforeId === draggedId ? null : { kind: 'pin', beforeId }
    }
    case 'notes-end':
      return isProject ? null : { kind: 'move', parentId: null, beforeId: null }
  }

  // A project's Overview row: only "after" it, i.e. first among the project's own children
  if (row.overviewOf) {
    if (isProject || position !== 'after') return null
    const first = objects.find((o) => o.parentId === row.overviewOf && o.id !== draggedId)
    return { kind: 'move', parentId: row.overviewOf, beforeId: first?.id ?? null }
  }

  const target = objects.find((o) => o.id === row.objectId)
  if (!target || target.id === draggedId) return null

  if (position === 'into') {
    if (target.kind !== 'project' || target.locked || isProject) return null
    return { kind: 'move', parentId: target.id, beforeId: null, into: target.id }
  }

  if (isProject) {
    // Only among the projects (top level)
    if (target.kind !== 'project') return null
    const beforeId =
      position === 'before' ? target.id : nextAfter(objects, target, draggedId, (o) => o.kind === 'project' && o.parentId === null)
    return { kind: 'move', parentId: null, beforeId }
  }

  // A map or note: next to another map or note (in its project, or in Notes), never among projects
  if (target.kind === 'project') return null
  const sibling = (o: MockObject) => o.parentId === target.parentId && o.kind !== 'project'
  const beforeId = position === 'before' ? target.id : nextAfter(objects, target, draggedId, sibling)
  return { kind: 'move', parentId: target.parentId, beforeId }
}
