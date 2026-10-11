import { useMemo, useState, type ComponentProps } from 'react'
import {
    LuArchive,
    LuColumns2,
    LuCopy,
    LuFolderInput,
    LuPencil,
    LuPin,
    LuPinOff,
    LuPlus,
    LuStickyNote,
    LuTrash2,
    LuUnlink,
} from 'react-icons/lu'
import LayoutsSection from '../../../features/layouts/LayoutsSection'
import { useLinkNode } from '../../../features/links/linkNode'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import {
    duplicateObject,
    renameObject,
    togglePin,
    useLinks,
    useMockObjects,
    usePins,
} from '../../../mocks/projectsStore'
import { isNoteLike } from '../../../mocks/projects'
import { buildSidebarSections, DASHBOARD_NODE, type SidebarItem } from '../../../mocks/sidebarTree'
import { NOTES_END } from './SidebarNotes'
import Divider from '../../ui/Divider'
import { useRowFlip } from '../../ui/tree/rowFlip'
import { useLids } from '../../ui/tree/swallow'
import type { TreeDnd, TreeMenuGroup, TreeNode, TreeRightIcon } from '../../ui/tree/types'
import TreeView from '../../ui/tree/TreeView'
import SidebarDialogs, { type SidebarDialog } from './SidebarDialogs'
import { archiveWithEffect, useSidebarDrop } from './sidebarDropState'
import SidebarNotes from './SidebarNotes'
import type { RowDropData } from './treeDrop'

// Not wired yet: shown in the menus, does nothing
const ADD_NOTE = { label: 'Add note', icon: LuStickyNote, onClick: () => {} }

const DIVIDER = 'my-(--divider-gap)'

/**
 * The sidebar's content, in sections (top to bottom): Layouts, Pinned, Dashboard, Projects, Notes.
 * Objects can be created (+), renamed in place (menu or double-click on the name), pinned,
 * duplicated, moved and deleted. Rows open on screen stay visible under their collapsed parent.
 */
export default function SidebarTree({ compact }: { compact: boolean }) {
    const objects = useMockObjects()
    const pins = usePins()
    const links = useLinks()
    const { pinned, projects, notes, items } = useMemo(() => buildSidebarSections(objects, pins, links), [objects, pins, links])
    const linkNodeFor = useLinkNode()
    const workspace = useWorkspace()
    const drop = useSidebarDrop()
    const lidOpen = useLids()
    // Rows glide to their new places after a drop, archive or restore
    useRowFlip([objects, pins])
    const [dialog, setDialog] = useState<SidebarDialog | null>(null)
    // The row whose name is being edited in place (one for all sections)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Actions of an object: groups of the ⋯ menu, a line between them
    const menuOf = (node: TreeNode, item: SidebarItem): TreeMenuGroup[] => {
        const isPinned = pins.includes(item.id)
        return [
            [
                // Shown as a pane: take it out of the panes
                ...(node.panel && workspace.isPane(node.panel)
                    ? [{ label: 'Remove from screen', icon: LuUnlink, onClick: () => workspace.close(node.panel!) }]
                    : []),
                { label: 'Rename', icon: LuPencil, onClick: () => setEditingId(node.id) },
                { label: isPinned ? 'Unpin' : 'Pin', icon: isPinned ? LuPinOff : LuPin, onClick: () => togglePin(item.id) },
            ],
            [
                { label: 'Duplicate', icon: LuCopy, onClick: () => duplicateObject(item.id) },
                // Projects stay top level: reordered by dragging, never moved into another
                ...(item.kind !== 'project'
                    ? [{ label: 'Move to', icon: LuFolderInput, onClick: () => setDialog({ kind: 'move', item }) }]
                    : []),
                ADD_NOTE,
                // Open it as a panel next to what's on screen
                ...(node.panel
                    ? [{ label: 'Add in screen', icon: LuColumns2, onClick: () => workspace.open(node.panel!) }]
                    : []),
                // Into the trash (restorable): the row falls into the bin
                {
                    label: 'Archive',
                    icon: LuArchive,
                    onClick: () => archiveWithEffect(item.id, document.querySelector(`[data-row-id="${CSS.escape(node.id)}"]`)),
                },
            ],
            [{ label: 'Delete', icon: LuTrash2, onClick: () => setDialog({ kind: 'delete', item }), danger: true }],
        ]
    }

    // Right icons, only on hover (the left icon is each node's own). Fixed rows (Dashboard, Overview): only undrag
    // Shown as a pane: "undrag" (take it out of the panes), left of the others
    const rightIcons = (node: TreeNode): TreeRightIcon[] => {
        const undrag: TreeRightIcon[] =
            node.panel && workspace.isPane(node.panel)
                ? [{ icon: LuUnlink, label: `Remove from screen: ${node.label}`, show: 'hover', onClick: () => workspace.close(node.panel!) }]
                : []
        const item = items.get(node.id)
        if (!item) return undrag
        const more: TreeRightIcon = { label: `More: ${item.name}`, show: 'hover', menu: menuOf(node, item) }
        if (item.kind !== 'project' || node.id.startsWith('pin:')) return [...undrag, more]
        const create = () => setDialog({ kind: 'create', parent: { kind: 'project', id: item.id, name: item.name } })
        return [...undrag, { icon: LuPlus, label: `New map in ${item.name}`, show: 'hover', onClick: create }, more]
    }

    // What a dragged row carries (rows that can't be picked up: none)
    const objectInfo = (node: TreeNode) => {
        const item = items.get(node.id)
        return node.draggable
            ? { nodeId: node.id, objectId: item?.id, kind: item?.kind, icon: node.icon, source: 'sidebar' as const }
            : undefined
    }

    // Drag & drop per section: which rows take drops (RowDropData, rules in treeDrop.ts) and what's
    // being dragged / where it would land (SidebarDrop)
    const dndFor = (section: RowDropData['section']): TreeDnd => ({
        dropData: (node): RowDropData | undefined => {
            if (section === 'fixed') return undefined
            const item = items.get(node.id)
            // A project's Overview row: things can go right after it (first in the project)
            if (!item && section === 'projects' && node.panel?.type === 'project') {
                return { zone: 'row', priority: 2, nodeId: node.id, section, overviewOf: node.panel.id }
            }
            if (!item) return undefined
            return { zone: 'row', priority: 2, nodeId: node.id, section, objectId: item.id, folder: item.kind === 'project' && !node.locked }
        },
        // Rows that aren't links (projects) drag themselves
        dragData: (node) => {
            const object = objectInfo(node)
            return object?.objectId ? { kind: 'object', label: node.label, object } : undefined
        },
        draggingId: drop.draggingNodeId,
        target: drop.target?.kind === 'row' ? { nodeId: drop.target.nodeId, position: drop.target.position } : null,
        lidOpen,
        // Projects and maps take links: a link node slides out while a note is dragged (features/links)
        linkNode: (node) => {
            const item = items.get(node.id)
            if (!item || isNoteLike(item.kind)) return undefined
            return linkNodeFor(item.id, node.id.startsWith('pin:') ? 'pin' : 'sidebar', item.name)
        },
    })

    // What every section's tree shares
    const tree: Omit<ComponentProps<typeof TreeView>, 'nodes' | 'label'> = {
        renderLink: (node, props) => <PanelDragLink node={node} object={objectInfo(node)} {...props} />,
        // Double-click on an object's name (or the menu's Rename): edit it in place
        onRename: (node, name) => {
            const item = items.get(node.id)
            if (item) renameObject(item.id, name)
        },
        canRename: (node) => items.has(node.id),
        editingId,
        onEditingChange: setEditingId,
        // What's on screen (page or pane) stays visible under its collapsed parent
        keepVisible: (node) => !!node.panel && workspace.isOpen(node.panel),
        // Thin rail: icons only, one column
        compact,
        icons: { right: rightIcons },
    }

    return (
        <>
            <LayoutsSection compact={compact} />

            {pinned.length > 0 && (
                <section aria-label="Pinned">
                    <Divider label="Pinned" compact={compact} className={DIVIDER} />
                    <TreeView nodes={pinned} label="Pinned" {...tree} dnd={dndFor('pinned')} />
                </section>
            )}

            <Divider compact={compact} className={DIVIDER} />
            <TreeView nodes={[DASHBOARD_NODE]} label="Main navigation" {...tree} dnd={dndFor('fixed')} />

            <section aria-label="Projects">
                <Divider
                    label="Projects"
                    action={{ icon: LuPlus, label: 'New project', onClick: () => setDialog({ kind: 'create', parent: { kind: 'projects' } }) }}
                    compact={compact}
                    className={DIVIDER}
                />
                <TreeView nodes={projects} label="Projects" {...tree} dnd={dndFor('projects')} />
            </section>

            <SidebarNotes
                nodes={notes}
                tree={{ ...tree, dnd: dndFor('notes') }}
                dropAtEnd={drop.target?.kind === 'row' && drop.target.nodeId === NOTES_END}
                compact={compact}
                onCreate={() => setDialog({ kind: 'create', parent: { kind: 'notes' } })}
            />

            <SidebarDialogs dialog={dialog} onClose={() => setDialog(null)} />
        </>
    )
}
