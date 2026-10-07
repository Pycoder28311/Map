import {
    LuArchive,
    LuColumns2,
    LuCopy,
    LuFolderInput,
    LuPencil,
    LuPin,
    LuPlus,
    LuStickyNote,
    LuTrash2,
} from 'react-icons/lu'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { SIDEBAR_TREE } from '../../../mocks/sidebarTree'
import TreeView from '../../ui/tree/TreeView'

/** The sidebar's content: the navigation tree. Draggable items open as panels */
export default function SidebarTree({ compact }: { compact: boolean }) {
    return (
        <TreeView
            nodes={SIDEBAR_TREE}
            label="Main navigation"
            renderLink={(node, props) => <PanelDragLink node={node} {...props} />}
            // TODO: rename on click (for now only the cursor says the name is editable)
            editableLabels
            // Thin rail: icons only
            compact={compact}
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
                        // Groups of actions, a line between them
                        menu: [
                            [
                                { label: 'Rename', icon: LuPencil, onClick: () => {} },
                                { label: 'Pin', icon: LuPin, onClick: () => {} },
                            ],
                            [
                                { label: 'Duplicate', icon: LuCopy, onClick: () => {} },
                                { label: 'Move to', icon: LuFolderInput, onClick: () => {} },
                                { label: 'Add note', icon: LuStickyNote, onClick: () => {} },
                                // Open it as a panel next to what's on screen
                                { label: 'Add in screen', icon: LuColumns2, onClick: () => {} },
                                { label: 'Archive', icon: LuArchive, onClick: () => {} },
                            ],
                            [{ label: 'Delete', icon: LuTrash2, onClick: () => {}, danger: true }],
                        ],
                    },
                ],
            }}
        />
    )
}
