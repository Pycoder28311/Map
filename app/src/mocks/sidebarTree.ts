// MOCK DATA: turns the mock objects into the sidebar's tree nodes. Replaced by the same mapping over
// backend data later; the components stay the same.
import { LuBox, LuFileText, LuFolder, LuFolderOpen, LuFolders, LuInfo, LuLayoutDashboard, LuMap, LuStickyNote } from 'react-icons/lu'
import type { ButtonIcon } from '../components/ui/icons/IconSlot'
import type { TreeNode } from '../components/ui/tree/types'
import type { MockObject, ObjectKind } from './projects'
import { isHidden, type Link } from './projectsStore'

/** A row the user can change (rename, duplicate, move, pin, archive, delete): one object */
export type SidebarItem = { kind: ObjectKind; id: string; name: string; parentId: string | null }

export const KIND_ICON: Record<ObjectKind, ButtonIcon> = {
  project: LuFolder,
  map: LuMap,
  note: LuStickyNote,
  article: LuFileText,
  object: LuBox,
  folder: LuFolders,
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

const itemOf = (o: MockObject): SidebarItem => ({ kind: o.kind, id: o.id, name: o.name, parentId: o.parentId })

// An object's row can be picked to share (features/share)
const shareData = (o: MockObject) => ({ 'data-share-id': o.id }) as const

/** A map or note row (a leaf that opens its panel) */
const leafOf = (o: MockObject, id = nodeIdOf(o), badge?: number): TreeNode => ({
  id,
  rowData: shareData(o),
  label: o.name,
  icon: KIND_ICON[o.kind],
  panel: { type: o.kind, id: o.id },
  draggable: o.draggable,
  locked: o.locked,
  badge,
})

/**
 * The sidebar's sections from the objects (archived ones left out):
 * - pinned: one leaf per pinned object (`pin:` ids), in pin order; a project opens its Overview
 * - projects: each project, its Overview, then its children
 * - notes: the top-level objects that aren't projects
 * `items`: which rows are objects (by node id, Pinned rows included); the others are fixed.
 */
export function buildSidebarSections(objects: MockObject[], pins: string[], links: Link[] = []) {
  const items = new Map<string, SidebarItem>()
  const visible = objects.filter((o) => !isHidden(objects, o))
  const byId = new Map(visible.map((o) => [o.id, o]))
  // How many visible objects each one is linked to (shown as a small count on its row)
  const linked = new Map<string, number>()
  for (const { noteId, targetId } of links) {
    if (!byId.has(noteId) || !byId.has(targetId)) continue
    linked.set(noteId, (linked.get(noteId) ?? 0) + 1)
    linked.set(targetId, (linked.get(targetId) ?? 0) + 1)
  }
  const badge = (id: string) => linked.get(id)

  /** An object's row in a project or in Notes: a leaf, or a folder with its articles (nested) */
  const rowOf = (o: MockObject): TreeNode => {
    items.set(nodeIdOf(o), itemOf(o))
    if (o.kind !== 'folder') return leafOf(o, nodeIdOf(o), badge(o.id))
    return {
      ...leafOf(o, nodeIdOf(o), badge(o.id)),
      children: visible.filter((c) => c.parentId === o.id).map(rowOf),
    }
  }

  const projects = visible
    .filter((o) => o.kind === 'project')
    .map((p): TreeNode => {
      items.set(nodeIdOf(p), itemOf(p))
      return {
        id: nodeIdOf(p),
        label: p.name,
        icon: KIND_ICON.project,
        openIcon: LuFolderOpen,
        rowData: shareData(p),
        draggable: p.draggable,
        locked: p.locked,
        badge: badge(p.id),
        children: [
          {
            id: `${nodeIdOf(p)}-overview`,
            label: 'Overview',
            icon: LuInfo,
            panel: { type: 'project', id: p.id },
            draggable: true,
            locked: true,
          },
          ...visible.filter((o) => o.parentId === p.id).map(rowOf),
        ],
      }
    })

  const notes = visible.filter((o) => o.parentId === null && o.kind !== 'project').map(rowOf)

  const pinned = pins.flatMap((id) => {
    const o = byId.get(id)
    if (!o) return []
    const nodeId = `pin:${nodeIdOf(o)}`
    items.set(nodeId, itemOf(o))
    const node = leafOf(o, nodeId, badge(o.id))
    // A project's shortcut opens its Overview
    return [o.kind === 'project' ? { ...node, panel: { type: 'project', id: o.id } } : node]
  })

  return { pinned, projects, notes, items }
}
