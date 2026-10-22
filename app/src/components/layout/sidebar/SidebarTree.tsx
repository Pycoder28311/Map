import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuLayoutDashboard, LuUnlink } from 'react-icons/lu'
import LayoutsSection from '../../../features/layouts/LayoutsSection'
import { useItemModal } from '../../../features/items/ItemModal'
import { NEW_ID } from '../../../lib/resource/newItem'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { resourcesWith } from '../../../resources/registry'
import Divider from '../../ui/Divider'
import type { TreeNode, TreeRightIcon } from '../../ui/tree/types'
import TreeView from '../../ui/tree/TreeView'
import ResourceSidebarSection from './ResourceSidebarSection'
import type { SidebarTreeSettings } from './ResourceRows'
import SidebarPinned from './SidebarPinned'

const DIVIDER = 'my-(--divider-gap)'

/** The Dashboard row: fixed (not an item), never dragged, never takes a drop */
const DASHBOARD_NODE: TreeNode = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: LuLayoutDashboard,
  panel: { type: 'dashboard' },
  draggable: false,
  locked: true,
}

const IN_SIDEBAR = resourcesWith('sidebar')

/**
 * The sidebar's content, in sections (top to bottom): Layouts, Pinned, Dashboard, then one section per resource that has one (Projects,
 * Notes), as the UI config says (resources.config.ts: surfaces.sidebar). The other items (folders, articles, object cards, maps) are
 * on the Dashboard, in their project's row. Items are created (+: a new page, the item is made when something is typed, NewItemEditor), renamed in place (menu or double-click on the name), pinned,
 * duplicated, moved to the Trash and deleted through their ⋯ menu. Rows open on screen stay visible.
 */
export default function SidebarTree({ compact }: { compact: boolean }) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const itemModal = useItemModal()
  // The row whose name is being edited in place (one for all sections)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Shown as a pane: "undrag" (take it out of the panes); the sections add their own icons (ResourceRows)
  const rightIcons = (node: TreeNode): TreeRightIcon[] =>
    node.panel && workspace.isPane(node.panel)
      ? [{ icon: LuUnlink, label: `Remove from screen: ${node.label}`, show: 'hover', onClick: () => workspace.close(node.panel!) }]
      : []

  // What every section's tree shares
  const tree: SidebarTreeSettings = {
    renderLink: (node, props) => <PanelDragLink node={node} {...props} />,
    editingId,
    onEditingChange: setEditingId,
    // What's on screen (page or pane) stays visible
    keepVisible: (node) => !!node.panel && workspace.isOpen(node.panel),
    // Thin rail: icons only, one column
    compact,
    icons: { right: rightIcons },
  }

  return (
    <>
      <LayoutsSection compact={compact} />

      <SidebarPinned resources={IN_SIDEBAR} tree={tree} compact={compact} />

      <Divider compact={compact} className={DIVIDER} />
      <TreeView nodes={[DASHBOARD_NODE]} label="Main navigation" {...tree} />

      {IN_SIDEBAR.map((resource) => (
        <ResourceSidebarSection key={resource.name} resource={resource} tree={tree} compact={compact} onCreate={() => (resource.surfaces.modal ? itemModal.open(resource, NEW_ID) : navigate(workspace.hrefOf({ type: resource.panelType, id: NEW_ID })))} />
      ))}
    </>
  )
}
