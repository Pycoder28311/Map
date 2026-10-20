// MOCK DATA: turns the mock objects into the sidebar's tree nodes. Replaced by the same mapping over
// backend data later; the components stay the same.
import { LuBox, LuLayoutDashboard, LuMap } from 'react-icons/lu'
import type { ButtonIcon } from '../components/ui/icons/IconSlot'
import type { TreeNode } from '../components/ui/tree/types'
import type { MockObject, ObjectKind } from './projects'
import { isHidden, type Link } from './projectsStore'

/** A row the user can change (rename, duplicate, move, pin, archive, delete): one object */
export type SidebarItem = { kind: ObjectKind; id: string; name: string }

export const KIND_ICON: Record<ObjectKind, ButtonIcon> = {
  map: LuMap,
  object: LuBox,
}

/** The node id of an object's row (Pinned rows: `pin:` + it) */
export const nodeIdOf = (object: { kind: ObjectKind; id: string }) => `${object.kind}-${object.id}`

/** The Dashboard row: fixed (not an object), never dragged, never takes a drop */
export const DASHBOARD_NODE: TreeNode = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: LuLayoutDashboard,
  panel: { type: 'dashboard' },
  draggable: false,
  locked: true,
}

const itemOf = (o: MockObject): SidebarItem => ({ kind: o.kind, id: o.id, name: o.name })

// An object's row can be picked to share (features/share)
const shareData = (o: MockObject) => ({ 'data-share-id': o.id }) as const

/** A map or object card row (a leaf that opens its panel; every object can be picked up) */
const leafOf = (o: MockObject, id = nodeIdOf(o), badge?: number): TreeNode => ({
  id,
  rowData: shareData(o),
  label: o.name,
  icon: KIND_ICON[o.kind],
  panel: { type: o.kind, id: o.id },
  draggable: true,
  locked: true,
  badge,
})

/**
 * The sidebar's sections from the objects (archived ones left out):
 * - pinned: one leaf per pinned object (`pin:` ids), in pin order
 * - objects: every object (notes and projects are not here: they come from the server)
 * `items`: which rows are objects (by node id, Pinned rows included); the others are fixed.
 */
export function buildSidebarSections(objects: MockObject[], pins: string[], links: Link[] = []) {
  const items = new Map<string, SidebarItem>()
  const visible = objects.filter((o) => !isHidden(o))
  const byId = new Map(visible.map((o) => [o.id, o]))
  // How many visible objects each one is linked to (shown as a small count on its row)
  const linked = new Map<string, number>()
  for (const { noteId, targetId } of links) {
    if (!byId.has(noteId) || !byId.has(targetId)) continue
    linked.set(noteId, (linked.get(noteId) ?? 0) + 1)
    linked.set(targetId, (linked.get(targetId) ?? 0) + 1)
  }
  const badge = (id: string) => linked.get(id)

  /** An object's row in Objects: a leaf */
  const rowOf = (o: MockObject): TreeNode => {
    items.set(nodeIdOf(o), itemOf(o))
    return leafOf(o, nodeIdOf(o), badge(o.id))
  }

  const objectRows = visible.map(rowOf)

  const pinned = pins.flatMap((id) => {
    const o = byId.get(id)
    if (!o) return []
    const nodeId = `pin:${nodeIdOf(o)}`
    items.set(nodeId, itemOf(o))
    return [leafOf(o, nodeId, badge(o.id))]
  })

  return { pinned, objects: objectRows, items }
}
