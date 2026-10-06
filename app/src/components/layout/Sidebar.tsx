import { useApp } from '../../context/AppContext'
import PanelDragLink from '../../features/workspace/PanelDragLink'
import { SIDEBAR_TREE } from '../../mocks/sidebarTree'
import TreeView from '../ui/tree/TreeView'

/** Side navigation; shown or hidden from the navbar (state in AppContext). Draggable items open as panels */
export default function Sidebar() {
    const { sidebarOpen } = useApp()
    if (!sidebarOpen) return null

    return (
        <nav id="sidebar" aria-label="Main" className="w-56 shrink-0 overflow-y-auto border-r border-gray-200 bg-white p-2">
            <TreeView
                nodes={SIDEBAR_TREE}
                label="Main navigation"
                renderLeaf={(node, props) => <PanelDragLink node={node} {...props} />}
            />
        </nav>
    )
}
