// MOCK DATA: turns the mock objects into the sidebar's tree nodes. Replaced by the same mapping over
// backend data later; the components stay the same.
import { LuFolderKanban, LuFolderOpen, LuInfo, LuLayoutDashboard, LuMap, LuStickyNote } from 'react-icons/lu'
import type { ButtonIcon } from '../components/ui/icons/IconSlot'
import type { TreeNode } from '../components/ui/tree/types'
import type { MockObject, ObjectKind } from './projects'
import { isHidden } from './projectsStore'

/** A row the user can change (rename, duplicate, move, pin, archive, delete): one object */
export type SidebarItem = { kind: ObjectKind; id: string; name: string; parentId: string | null }

export const KIND_ICON: Record<ObjectKind, ButtonIcon> = { project: LuFolderKanban, map: LuMap, note: LuStickyNote }

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

const itemOf = (o: MockObject): SidebarItem => ({ kind: o.kind, id: o.id, name: o.name, parentId: o.parentId })

/** A map or note row (a leaf that opens its panel) */
const leafOf = (o: MockObject, id = nodeIdOf(o)): TreeNode => ({
  id,
  label: o.name,
  icon: KIND_ICON[o.kind],
  panel: { type: o.kind, id: o.id },
  draggable: o.draggable,
  locked: o.locked,
})

/**
 * The sidebar's sections from the objects (archived ones left out):
 * - pinned: one leaf per pinned object (`pin:` ids), in pin order; a project opens its Overview
 * - projects: each project, its Overview, then its children
 * - notes: the top-level objects that aren't projects
 * `items`: which rows are objects (by node id, Pinned rows included); the others are fixed.
 */
export function buildSidebarSections(objects: MockObject[], pins: string[]) {
  const items = new Map<string, SidebarItem>()
  const visible = objects.filter((o) => !isHidden(objects, o))
  const byId = new Map(visible.map((o) => [o.id, o]))

  const projects = visible
    .filter((o) => o.kind === 'project')
    .map((p): TreeNode => {
      items.set(nodeIdOf(p), itemOf(p))
      return {
        id: nodeIdOf(p),
        label: p.name,
        icon: KIND_ICON.project,
        openIcon: LuFolderOpen,
        draggable: p.draggable,
        locked: p.locked,
        children: [
          {
            id: `${nodeIdOf(p)}-overview`,
            label: 'Overview',
            icon: LuInfo,
            panel: { type: 'project', id: p.id },
            draggable: true,
            locked: true,
          },
          ...visible
            .filter((o) => o.parentId === p.id)
            .map((o) => {
              items.set(nodeIdOf(o), itemOf(o))
              return leafOf(o)
            }),
        ],
      }
    })

  const notes = visible
    .filter((o) => o.parentId === null && o.kind !== 'project')
    .map((o) => {
      items.set(nodeIdOf(o), itemOf(o))
      return leafOf(o)
    })

  const pinned = pins.flatMap((id) => {
    const o = byId.get(id)
    if (!o) return []
    const nodeId = `pin:${nodeIdOf(o)}`
    items.set(nodeId, itemOf(o))
    const node = leafOf(o, nodeId)
    // A project's shortcut opens its Overview
    return [o.kind === 'project' ? { ...node, panel: { type: 'project', id: o.id } } : node]
  })

  return { pinned, projects, notes, items }
}
