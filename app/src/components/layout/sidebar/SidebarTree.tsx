import { useMemo, useState, type ComponentProps } from 'react'
import { LuPlus, LuUnlink } from 'react-icons/lu'
import LayoutsSection from '../../../features/layouts/LayoutsSection'
import { useLinkNode } from '../../../features/links/linkNode'
import { useLinkPick } from '../../../features/links/linkPick'
import PanelDragLink from '../../../features/workspace/PanelDragLink'
import { useWorkspace } from '../../../features/workspace/useWorkspace'
import { useObjectActions } from '../../../features/objects/useObjectActions'
import { isNoteLike } from '../../../mocks/projects'
import { isLinkTarget, renameObject, useLinks, useMockObjects, usePins } from '../../../mocks/projectsStore'
import { buildSidebarSections, DASHBOARD_NODE, type SidebarItem } from '../../../mocks/sidebarTree'
import { NOTES_END } from './SidebarNotes'
import Divider from '../../ui/Divider'
import { useRowFlip } from '../../ui/tree/rowFlip'
import { useLids } from '../../ui/tree/swallow'
import type { TreeDnd, TreeMenuGroup, TreeNode, TreeRightIcon } from '../../ui/tree/types'
import TreeView from '../../ui/tree/TreeView'
import { useSidebarDrop } from './sidebarDropState'
import SidebarNotes from './SidebarNotes'
import type { RowDropData } from './treeDrop'

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
    const picking = useLinkPick() !== null
    const workspace = useWorkspace()
    const drop = useSidebarDrop()
    const lidOpen = useLids()
    // Rows glide to their new places after a drop, archive or restore
    useRowFlip([objects, pins])
    const actions = useObjectActions()
    // The row whose name is being edited in place (one for all sections)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Actions of an object: groups of the ⋯ menu, a line between them (shared with the Dashboard's cards)
    const menuOf = (node: TreeNode, item: SidebarItem): TreeMenuGroup[] =>
        actions.menuOf(item, {
            panel: node.panel,
            onRename: () => setEditingId(node.id),
            element: () => document.querySelector(`[data-row-id="${CSS.escape(node.id)}"]`),
        })

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
        const create = () => actions.openDialog({ kind: 'create', parent: { kind: 'project', id: item.id, name: item.name } })
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
            return { zone: 'row', priority: 2, nodeId: node.id, section, objectId: item.id, folder: (item.kind === 'project' || item.kind === 'folder') && !node.locked }
        },
        // Rows that aren't links (projects) drag themselves
        dragData: (node) => {
            const object = objectInfo(node)
            return object?.objectId ? { kind: 'object', label: node.label, object } : undefined
        },
        draggingId: drop.draggingNodeId,
        target: drop.target?.kind === 'row' ? { nodeId: drop.target.nodeId, position: drop.target.position } : null,
        lidOpen,
        // Projects, maps and object cards take links: a link node slides out while a note is dragged (features/links)
        linkNode: (node) => {
            const item = items.get(node.id)
            // Linking a map object: the notes and articles take the node; else the targets of dragged notes (projects, maps…)
            if (!item || !(picking ? isNoteLike(item.kind) : isLinkTarget(item.kind))) return undefined
            return linkNodeFor(item.id, node.id.startsWith('pin:') ? 'pin' : 'sidebar', item.name, item.kind)
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
                    action={{ icon: LuPlus, label: 'New project', onClick: () => actions.openDialog({ kind: 'create', parent: { kind: 'projects' } }) }}
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
                onCreate={() => actions.openDialog({ kind: 'create', parent: { kind: 'notes' } })}
            />

            {actions.dialogs}
        </>
    )
}
