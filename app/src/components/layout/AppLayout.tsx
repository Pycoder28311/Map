import { Outlet } from 'react-router-dom'
import PageDropZones from '../../features/workspace/PageDropZones'
import LinkZone from '../../features/links/LinkZone'
import { FRAME_RADIUS } from '../../features/workspace/paneStyles'
import { useWorkspace } from '../../features/workspace/useWorkspace'
import WorkspaceProvider from '../../features/workspace/WorkspaceProvider'
import { PANELS } from '../../panels'
import Navbar from './Navbar'
import Sidebar from './sidebar/Sidebar'
import SidebarProvider from './sidebar/SidebarProvider'

/**
 * Frame of the signed-in pages: navbar on top, sidebar on the left, the page (Outlet) beside it.
 * SidebarProvider: the sidebar's state, shared with the navbar's ☰ button.
 * WorkspaceProvider lets sidebar items be dragged onto the page or the panels of /workspace.
 */
export default function AppLayout() {
    return (
        <WorkspaceProvider panels={PANELS}>
            {/* Notes dropped on link nodes (sidebar rows, Dashboard cards…) get linked */}
            <LinkZone />
            <SidebarProvider>
                <div className="flex h-screen flex-col">
                    <Navbar />
                    <div className="flex min-h-0 flex-1">
                        <Sidebar />
                        <div className="relative min-w-0 flex-1">
                            {/* isolate: the z-indexes inside the page stay below the sidebar lying over it */}
                            <main className="relative isolate h-full overflow-auto bg-surface-muted">
                                <Outlet />
                                <PageDropZones />
                            </main>
                            <ChromeShadow />
                        </div>
                    </div>
                </div>
            </SidebarProvider>
        </WorkspaceProvider>
    )
}

/**
 * The light shadow the navbar and sidebar cast on the page, along its top and left edges, with the
 * page's top-left corner rounded like the workspace frame (the bars' colour fills the corner). Over
 * the page, outside its scrolling, so it never scrolls away; never takes the pointer. The workspace's
 * panes have their own frame with the same shadow (Workspace), so it isn't drawn there twice.
 */
function ChromeShadow() {
    const { onWorkspace, count } = useWorkspace()
    if (onWorkspace && count > 1) return null
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
            <div
                style={{
                    borderTopLeftRadius: FRAME_RADIUS,
                    // A spread in the bars' colour fills the rounded corner; then the shadow itself
                    boxShadow: `0 0 0 ${FRAME_RADIUS}px var(--surface), var(--chrome-shadow)`,
                }}
                className="absolute inset-0"
            />
        </div>
    )
}
