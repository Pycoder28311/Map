// Where a dragged sidebar object lands, and whether it may (pure: tested in treeDrop.test.ts).
// Rules: an object goes between rows of Objects (or at their end); Pinned rows reorder pins (a dropped
// object gets pinned); Dashboard never takes a drop.
import type { MockObject } from '../../../mocks/projects'

export type DropPosition = 'before' | 'after' | 'into'

/** What each droppable row says about itself (dnd-kit droppable data) */
export type RowDropData = {
  /** The drop system's zone (features/drag/objectDrop.ts) and priority among droppables */
  zone?: 'row'
  priority?: number
  nodeId: string
  section: 'pinned' | 'objects' | 'objects-end' | 'fixed'
  /** The object this row is */
  objectId?: string
}

export type DropAction =
  /** Move just before `beforeId` (null: last) */
  | { kind: 'move'; beforeId: string | null }
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
  if (!dragged) return null

  switch (row.section) {
    case 'fixed':
      return null
    case 'pinned': {
      if (!row.objectId) return null
      const i = pins.indexOf(row.objectId)
      const beforeId = position === 'after' ? (pins.slice(i + 1).find((p) => p !== draggedId) ?? null) : row.objectId
      return beforeId === draggedId ? null : { kind: 'pin', beforeId }
    }
    case 'objects-end':
      return { kind: 'move', beforeId: null }
  }

  // Next to another object
  const target = objects.find((o) => o.id === row.objectId)
  if (!target || target.id === draggedId || position === 'into') return null
  const beforeId = position === 'before' ? target.id : nextAfter(objects, target, draggedId, (o) => !o.archived)
  return { kind: 'move', beforeId }
}
