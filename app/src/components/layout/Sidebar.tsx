import { LuCopy, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'
import { useApp } from '../../context/AppContext'
import PanelDragLink from '../../features/workspace/PanelDragLink'
import { SIDEBAR_TREE } from '../../mocks/sidebarTree'
import TreeView from '../ui/tree/TreeView'

/** Side navigation; shown or hidden from the navbar (state in AppContext). Draggable items open as panels */
export default function Sidebar() {
    const { sidebarOpen } = useApp()
    if (!sidebarOpen) return null

    return (
        <nav id="sidebar" aria-label="Main" className="w-56 shrink-0 overflow-y-auto bg-surface p-2">
            <TreeView
                nodes={SIDEBAR_TREE}
                label="Main navigation"
                renderLink={(node, props) => <PanelDragLink node={node} {...props} />}
                // TODO: rename on click (for now only the cursor says the name is editable)
                editableLabels
                icons={{
                    // Add + menu buttons on the right, only on hover (the left icon is each node's own)
                    right: (node) => [
                        // TODO: add an item inside this one
                        { icon: LuPlus, label: `Add to: ${node.label}`, show: 'hover', onClick: () => {} },
                        {
                            // A menu: its trigger is always the ⋯ (dots fly out into the items)
                            label: `More: ${node.label}`,
                            show: 'hover',
                            // TODO: real actions (examples for now)
                            menu: [
                                { label: 'Rename', icon: LuPencil, onClick: () => {} },
                                { label: 'Duplicate', icon: LuCopy, onClick: () => {} },
                                { label: 'Delete', icon: LuTrash2, onClick: () => {}, danger: true },
                            ],
                        },
                    ],
                }}
            />
        </nav>
    )
}
